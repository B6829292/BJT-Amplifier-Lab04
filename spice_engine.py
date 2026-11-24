"""Run the Lab 04 CE reference circuit with an external ngspice executable.

SI units throughout. The external 2N3904 model is not instructor-verified.
Vin is the source side of Cin; Vout is the load side of Cout.
"""
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile

DEFAULT_EXECUTABLE = r'C:\ngspice\Spice64\bin\ngspice_con.exe'
DEFAULTS = dict(vcc=12.0, r1=100e3, r2=22e3, rc=2.2e3, re=1e3,
                rl=10e3, cin=10e-6, cout=10e-6, amplitude=0.01, frequency=1000.0)


class SpiceError(RuntimeError):
    """A simulation could not produce trustworthy results."""


def _parameters(values):
    values = values or {}
    if set(values) - set(DEFAULTS):
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
    bounds = {'vcc': (0.01, 100), 'r1': (1, 1e9), 'r2': (1, 1e9),
              'rc': (1, 1e9), 're': (1, 1e9), 'rl': (1, 1e9),
              'cin': (1e-12, 1), 'cout': (1e-12, 1),
              'amplitude': (1e-9, 100), 'frequency': (1, 1e6)}
    for key, (low, high) in bounds.items():
        if not low <= result[key] <= high:
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


def simulate(analysis, values=None, *, executable=None, model_path=None, timeout=15):
    p = _parameters(values)
    if analysis not in ('dc', 'ac', 'tran'):
        raise ValueError('Choose dc, ac or tran.')
    executable = executable or os.environ.get('NGSPICE_PATH', DEFAULT_EXECUTABLE)
    if not Path(executable).is_file():
        raise SpiceError('ngspice executable not found; set NGSPICE_PATH.')
    model_path = model_path or os.environ.get('BJT_MODEL_PATH')
    if not model_path or not Path(model_path).is_file():
        raise SpiceError('2N3904 model not found; set BJT_MODEL_PATH.')
    command = {'dc': 'op\nprint v(b) v(e) v(c) @q1[ic]',
               'ac': 'ac dec 40 1 100meg\nwrdata result.dat v(out) v(in)',
               'tran': f"tran {1 / p['frequency'] / 100:.12g} {5 / p['frequency']:.12g}\nwrdata result.dat v(in) v(out)"}[analysis]
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
Q1 c b e 2N3904
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
            (work / 'model.lib').write_bytes(Path(model_path).read_bytes())
            (work / 'circuit.cir').write_text(netlist, encoding='ascii')
            run = subprocess.run([str(executable), '-b', 'circuit.cir'], cwd=work,
                                 capture_output=True, text=True, timeout=timeout, check=False)
        except subprocess.TimeoutExpired as exc:
            raise SpiceError('ngspice timed out.') from exc
        except OSError as exc:
            raise SpiceError(f'Could not run ngspice or read model: {exc}') from exc
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
        result.update(analysis=analysis, model='2N3904 (Virginia Tech OPEL; not instructor-verified)',
                      input_node='in (source side of Cin)', output_node='out (load side of Cout)',
                      log=log, netlist=netlist)
        return result
