import math
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import spice_engine as engine


class SpiceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.model = Path(self.directory.name) / 'model.lib'
        self.model.write_text('.model 2N3904 NPN\n', encoding='ascii')

    def test_rejects_bad_values_before_running(self):
        for field, value in [('re', 0), ('cin', float('nan')), ('frequency', -1), ('r1', '1k\n.end')]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                engine.simulate('dc', {field: value})

    def test_missing_executable(self):
        with self.assertRaisesRegex(engine.SpiceError, 'executable'):
            engine.simulate('dc', executable='Z:/does-not-exist.exe')

    def test_timeout(self):
        with patch('spice_engine.subprocess.run', side_effect=subprocess.TimeoutExpired('ngspice', 1)):
            with self.assertRaisesRegex(engine.SpiceError, 'timed out'):
                engine.simulate('dc', executable=sys.executable, model_path=self.model)

    def test_malformed_output_is_rejected(self):
        with self.assertRaises(engine.SpiceError):
            engine.parse_dc('v(b) = nan\nv(e) = 1\nv(c) = 2\n@q1[ic] = 3')

    def test_simulator_failure_is_reported(self):
        failure = subprocess.CompletedProcess([], 1, '', 'Error: solver failed')
        with patch('spice_engine.subprocess.run', return_value=failure):
            with self.assertRaisesRegex(engine.SpiceError, 'simulation failed'):
                engine.simulate('dc', executable=sys.executable, model_path=self.model)

    def test_success_without_output_is_not_success(self):
        empty = subprocess.CompletedProcess([], 0, 'ngspice done', '')
        with patch('spice_engine.subprocess.run', return_value=empty):
            with self.assertRaises(engine.SpiceError):
                engine.simulate('ac', executable=sys.executable, model_path=self.model)

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Set BJT_MODEL_PATH to run real ngspice integration tests')
    def test_real_dc(self):
        result = engine.simulate('dc')
        self.assertAlmostEqual(result['vb'], 2.003674, places=4)
        self.assertAlmostEqual(result['vce'], 9.087216 - 1.332880, places=4)
        self.assertAlmostEqual(result['ic'], 0.001324035, places=6)

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Set BJT_MODEL_PATH to run real ngspice integration tests')
    def test_real_ac_and_transient_respond_to_inputs(self):
        ac = engine.simulate('ac')
        self.assertGreater(len(ac['frequency_hz']), 50)
        middle = min(range(len(ac['frequency_hz'])), key=lambda i: abs(ac['frequency_hz'][i] - 1000))
        self.assertTrue(math.isfinite(ac['gain_db'][middle]))
        self.assertGreater(abs(ac['phase_deg'][middle]), 90)
        a = engine.simulate('tran')
        b = engine.simulate('tran', {'amplitude': 0.02})
        self.assertGreater(len(a['time_s']), 50)
        self.assertAlmostEqual(max(b['vin_v']) / max(a['vin_v']), 2, delta=0.05)
        self.assertLess(min(a['vout_v']), -0.001)


if __name__ == '__main__':
    unittest.main()
