"""Run the Lab 04 CE reference circuit with an external ngspice executable.

SI units throughout. The circuit uses the project's configured 2N3904 model.
Vin is the source side of Cin; Vout is the load side of Cout.
"""
from hashlib import sha256
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile

DEFAULT_EXECUTABLE = r'C:\ngspice\Spice64\bin\ngspice_con.exe'
DEFAULTS = dict(vcc=12.0, r1=100e3, r2=22e3, rc=2.2e3, re=1e3,
                rl=10e3, cin=10e-6, cout=10e-6, amplitude=0.01, frequency=1000.0)
CAPACITOR_BOUNDS = (1e-12, 1)
BOUNDS = {'vcc': (0.01, 100), 'r1': (1, 1e9), 'r2': (1, 1e9),
          'rc': (1, 1e9), 're': (1, 1e9), 'rl': (1, 1e9),
          'cin': CAPACITOR_BOUNDS, 'cout': CAPACITOR_BOUNDS, 'ce': CAPACITOR_BOUNDS,
          'amplitude': (1e-9, 100), 'frequency': (1, 1e6)}
REFERENCE_MODEL_SHA256 = 'ab02e9b61ef31c8833b0abec5c36945ec46f4ee54778a8a72507eea9d2dec6ed'
REFERENCE_TOLERANCE = 0.05


class SpiceError(RuntimeError):
    """A simulation could not produce trustworthy results."""


def _read_model(model_path):
    path = model_path or os.environ.get('BJT_MODEL_PATH')
    if not path:
        raise SpiceError('2N3904 model not found; set BJT_MODEL_PATH.')
    try:
        model = Path(path).read_bytes()
    except FileNotFoundError as exc:
        raise SpiceError('2N3904 model not found; set BJT_MODEL_PATH.') from exc
    except OSError as exc:
        raise SpiceError('Could not read the configured 2N3904 model file.') from exc
    if not model.strip():
        raise SpiceError('The configured 2N3904 model file is empty.')
    return model


def _model_info(fingerprint, status, detail):
    reference = fingerprint == REFERENCE_MODEL_SHA256
    source = 'Virginia Tech OPEL library' if reference else 'Project-configured SPICE file' if fingerprint else '—'
    return dict(device='2N3904', source=source, status=status, detail=detail,
                fingerprint=fingerprint, reference=reference)


def inspect_model(model_path=None):
    """Report availability and origin without making a claim about solver acceptance."""
    try:
        model = _read_model(model_path)
    except SpiceError as exc:
        return _model_info(None, 'unavailable', str(exc))
    return _model_info(sha256(model).hexdigest(), 'configured', 'File available')


def _parameters(values):
    values = values or {}
    if set(values) - BOUNDS.keys():
        raise ValueError('Unknown circuit parameter.')
    result = DEFAULTS.copy()
    for key, raw in values.items():
        if isinstance(raw, bool):
            raise ValueError(f'{key} must be a finite positive number.')
        try:
            number = float(raw)
        except (TypeError, ValueError, OverflowError) as exc:
            raise ValueError(f'{key} must be a finite positive number.') from exc
        if not math.isfinite(number) or number <= 0:
            raise ValueError(f'{key} must be a finite positive number.')
        result[key] = number
    for key, value in result.items():
        low, high = BOUNDS[key]
        if not low <= value <= high:
            raise ValueError(f'{key} must be between {low:g} and {high:g} SI units.')
    return result


def parse_dc(text):
    fields = {}
    for line in text.splitlines():
        match = re.match(r'\s*(v\(b\)|v\(e\)|v\(c\)|@q1\[ic\])\s*=\s*(\S+)', line, re.I)
        if match:
            try:
                fields[match.group(1).lower()] = float(match.group(2))
            except ValueError as exc:
                raise SpiceError('Invalid DC output.') from exc
    if len(fields) != 4 or not all(math.isfinite(x) for x in fields.values()):
        raise SpiceError('Missing or invalid DC output.')
    return dict(vb=fields['v(b)'], ve=fields['v(e)'], vc=fields['v(c)'],
                vce=fields['v(c)'] - fields['v(e)'], ic=fields['@q1[ic]'],
                units={'vb': 'V', 've': 'V', 'vc': 'V', 'vce': 'V', 'ic': 'A'})


def _rows(path, columns):
    try:
        lines = path.read_text(encoding='utf-8').splitlines()
        rows = [[float(x) for x in line.split()] for line in lines if line.strip()]
    except (OSError, UnicodeError, ValueError) as exc:
        raise SpiceError('Missing or invalid simulation data.') from exc
    if len(rows) < 2 or any(len(row) != columns or not all(map(math.isfinite, row)) for row in rows):
        raise SpiceError('Missing or invalid simulation data.')
    if any(b[0] <= a[0] for a, b in zip(rows, rows[1:])):
        raise SpiceError('Simulation scale is not strictly increasing.')
    return rows


def _reference_checks(analysis, parameters, result, model_hash):
    """Check the independent unbypassed fixture documented in docs/validation.md."""
    if model_hash != REFERENCE_MODEL_SHA256 or parameters.keys() != DEFAULTS.keys():
        return None
    if any(not math.isclose(parameters[key], expected, rel_tol=1e-15) for key, expected in DEFAULTS.items()):
        return None
    if analysis == 'dc':
        metrics = [('VCE', result['vce'], 7.754336511, 'V'),
                   ('IC', result['ic'] * 1000, 1.324034770, 'mA')]
    elif analysis == 'ac':
        frequencies = result['frequency_hz']
        nearest = min(range(len(frequencies)), key=lambda index: abs(frequencies[index] - 1000))
        gain = 10 ** (result['gain_db'][nearest] / 20) if math.isclose(frequencies[nearest], 1000, rel_tol=1e-6) else None
        metrics = [('Gain at 1 kHz', gain, 10 ** (4.8895908409 / 20), 'V/V')]
    else:
        metrics = [('Vout peak', max(map(abs, result['vout_v'])) * 1000, 17.5917128, 'mV')]
    return [dict(label=label, measured=measured, target=target, unit=unit,
                 tolerance=REFERENCE_TOLERANCE,
                 passed=measured is not None and abs(measured - target) <= REFERENCE_TOLERANCE * abs(target))
            for label, measured, target, unit in metrics]


def simulate(analysis, values=None, *, executable=None, model_path=None, timeout=15):
    p = _parameters(values)
    if analysis not in ('dc', 'ac', 'tran'):
        raise ValueError('Choose dc, ac or tran.')
    executable = executable or os.environ.get('NGSPICE_PATH', DEFAULT_EXECUTABLE)
    if not Path(executable).is_file():
        raise SpiceError('ngspice executable not found; set NGSPICE_PATH.')
    model_bytes = _read_model(model_path)
    command = {'dc': 'op\nprint v(b) v(e) v(c) @q1[ic]',
               'ac': 'ac dec 40 1 100meg\nwrdata result.dat v(out) v(in)',
               'tran': f"tran {1 / p['frequency'] / 100:.12g} {5 / p['frequency']:.12g}\nwrdata result.dat v(in) v(out)"}[analysis]
    emitter_bypass = f"CE e 0 {p['ce']:.12g}\n" if 'ce' in p else ''
    netlist = f'''Lab 04 reference CE amplifier
VCC supply 0 DC {p['vcc']:.12g}
VS in 0 DC 0 AC 1 SIN(0 {p['amplitude']:.12g} {p['frequency']:.12g})
R1 supply b {p['r1']:.12g}
R2 b 0 {p['r2']:.12g}
RC supply c {p['rc']:.12g}
RE e 0 {p['re']:.12g}
RL out 0 {p['rl']:.12g}
CIN in b {p['cin']:.12g}
COUT c out {p['cout']:.12g}
{emitter_bypass}Q1 c b e 2N3904
.include model.lib
.control
set noaskquit
set wr_singlescale
{command}
quit
.endc
.end
'''
    with tempfile.TemporaryDirectory(prefix='lab04-spice-') as directory:
        work = Path(directory)
        try:
            (work / 'model.lib').write_bytes(model_bytes)
            (work / 'circuit.cir').write_text(netlist, encoding='ascii')
            run = subprocess.run([str(executable), '-b', 'circuit.cir'], cwd=work,
                                 capture_output=True, text=True, timeout=timeout, check=False)
        except subprocess.TimeoutExpired as exc:
            raise SpiceError('ngspice timed out.') from exc
        except OSError as exc:
            raise SpiceError('Could not start ngspice or prepare its working files.') from exc
        log = run.stdout + '\n' + run.stderr
        if run.returncode != 0 or re.search(r'(?im)^\s*(?:fatal\s+)?error\b', log):
            raise SpiceError('ngspice simulation failed: ' + log[-2000:])
        if analysis == 'dc':
            result = parse_dc(log)
        elif analysis == 'tran':
            rows = _rows(work / 'result.dat', 3)
            result = dict(time_s=[r[0] for r in rows], vin_v=[r[1] for r in rows],
                          vout_v=[r[2] for r in rows], units={'time': 's', 'voltage': 'V'})
        else:
            rows = _rows(work / 'result.dat', 5)
            response = []
            for _, out_re, out_im, in_re, in_im in rows:
                denominator = complex(in_re, in_im)
                if not denominator:
                    raise SpiceError('AC input is zero; gain is undefined.')
                response.append(complex(out_re, out_im) / denominator)
            if any(abs(value) == 0 or not math.isfinite(abs(value)) for value in response):
                raise SpiceError('AC gain is zero or invalid.')
            result = dict(frequency_hz=[r[0] for r in rows],
                          gain_db=[20 * math.log10(abs(x)) for x in response],
                          phase_deg=[math.degrees(math.atan2(x.imag, x.real)) for x in response],
                          units={'frequency': 'Hz', 'gain': 'dB', 'phase': 'degrees'})
        fingerprint = sha256(model_bytes).hexdigest()
        model_info = _model_info(fingerprint, 'loaded', 'Loaded by ngspice')
        reference_checks = _reference_checks(analysis, p, result, fingerprint)
        result.update(analysis=analysis, model=f"{model_info['device']} · {model_info['source']}", model_info=model_info,
                      input_node='in (source side of Cin)', output_node='out (load side of Cout)',
                      log=log, netlist=netlist, reference_checks=reference_checks)
        return result
