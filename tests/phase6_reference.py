"""Independent acceptance evidence: direct ngspice, no app/adapter imports.

Run with BJT_MODEL_PATH set. Does not copy or redistribute the model.
"""
import cmath
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'evidence' / os.environ.get('BJT_ACCEPTANCE_EVIDENCE', 'phase6')
MODEL = Path(os.environ['BJT_MODEL_PATH']).resolve()
ENGINE = os.environ.get('NGSPICE_PATH', r'C:\ngspice\Spice64\bin\ngspice_con.exe')


def reference(name, mode, re_value=1000, amplitude=.01, frequency=1000):
    directory = OUT / name
    directory.mkdir(parents=True, exist_ok=True)
    command = {
        'dc': 'op\nprint v(b) v(e) v(c) @q1[ic]',
        'ac': 'ac dec 40 1 100meg\nwrdata samples.txt v(out) v(in)',
        'tran': f'tran {1 / frequency / 100:.12g} {5 / frequency:.12g}\nwrdata samples.txt v(in) v(out)',
    }[mode]
    netlist = f'''Independent Lab04 acceptance reference
VCC supply 0 DC 12
VS in 0 DC 0 AC 1 SIN(0 {amplitude} {frequency})
R1 supply b 100000
R2 b 0 22000
RC supply c 2200
RE e 0 {re_value}
RL out 0 10000
CIN in b 0.00001
COUT c out 0.00001
Q1 c b e 2N3904
.include "{MODEL.as_posix()}"
.control
set noaskquit
set wr_singlescale
set numdgt=15
{command}
quit
.endc
.end
'''
    (directory / 'reference.cir').write_text(netlist, encoding='ascii')
    run = subprocess.run([ENGINE, '-b', 'reference.cir'], cwd=directory,
                         capture_output=True, text=True, timeout=30)
    log = run.stdout + '\n' + run.stderr
    (directory / 'ngspice.log').write_text(log, encoding='utf-8')
    if run.returncode or re.search(r'(?im)^\s*(?:fatal\s+)?error\b', log):
        raise RuntimeError(log)
    if mode == 'dc':
        raw = {key: float(value) for key, value in re.findall(
            r'(v\([bce]\)|@q1\[ic\])\s*=\s*(\S+)', log)}
        return dict(vb=raw['v(b)'], ve=raw['v(e)'], vc=raw['v(c)'],
                    vce=raw['v(c)'] - raw['v(e)'], ic=raw['@q1[ic]'])
    rows = [[float(value) for value in line.split()]
            for line in (directory / 'samples.txt').read_text().splitlines() if line.strip()]
    if mode == 'tran':
        return dict(time_s=[row[0] for row in rows], vin_v=[row[1] for row in rows],
                    vout_v=[row[2] for row in rows])
    ratios = [complex(row[1], row[2]) / complex(row[3], row[4]) for row in rows]
    return dict(frequency_hz=[row[0] for row in rows],
                gain_db=[20 * math.log10(abs(value)) for value in ratios],
                phase_deg=[math.degrees(cmath.phase(value)) for value in ratios])


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    data = {name: reference(name, mode, **changes) for name, mode, changes in [
        ('dc', 'dc', {}), ('dc_re2', 'dc', {'re_value': 2000}),
        ('ac', 'ac', {}), ('tran', 'tran', {}),
        ('tran_changed', 'tran', {'amplitude': .02, 'frequency': 2000}),
    ]}
    data['environment'] = dict(executable=ENGINE, model_path=str(MODEL),
        model_sha256=hashlib.sha256(MODEL.read_bytes()).hexdigest(),
        version=subprocess.run([ENGINE, '--version'], capture_output=True, text=True).stdout)
    (OUT / 'independent.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
    runner = Path(os.environ.get('BJT_ACCEPTANCE_BROWSER', 'tests/phase6_browser_check.js')).read_text(encoding='utf-8')
    (OUT / 'browser-run.js').write_text(runner.replace('__REFERENCE__', json.dumps(data)), encoding='utf-8')
    print(json.dumps({key: value if key.startswith('dc') or key == 'environment'
                     else {field: len(samples) for field, samples in value.items()}
                     for key, value in data.items()}, indent=2))
