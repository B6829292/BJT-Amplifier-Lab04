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

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Set BJT_MODEL_PATH to run real ngspice integration tests')
    def test_real_bypass_changes_ac_and_transient_but_preserves_dc(self):
        without = {mode: engine.simulate(mode) for mode in ('dc', 'ac', 'tran')}
        with_ce = {mode: engine.simulate(mode, {'ce': 100e-6}) for mode in without}
        for mode in without:
            self.assertNotIn('\nCE ', without[mode]['netlist'])
            self.assertIn('\nCE e 0 0.0001\n', with_ce[mode]['netlist'])
        self.assertAlmostEqual(with_ce['dc']['vce'], without['dc']['vce'], places=5)
        sample = with_ce['ac']['frequency_hz'].index(1000)
        self.assertGreater(with_ce['ac']['gain_db'][sample], without['ac']['gain_db'][sample] + 10)
        self.assertGreater(max(with_ce['tran']['vout_v']), max(without['tran']['vout_v']) * 3)

    def test_reference_benchmark_requires_the_documented_model_and_inputs(self):
        values = engine.DEFAULTS.copy()
        model = engine.REFERENCE_MODEL_SHA256
        near = {'vce': 7.7543, 'ic': 0.0013240}
        far = {'vce': 8.5, 'ic': 0.0013240}
        self.assertTrue(all(item['passed'] for item in engine._reference_checks('dc', values, near, model)))
        form_values = dict(values, cin=10 * 1e-6, cout=10 * 1e-6)
        self.assertTrue(all(item['passed'] for item in engine._reference_checks('dc', form_values, near, model)))
        self.assertFalse(engine._reference_checks('dc', values, far, model)[0]['passed'])
        self.assertIsNone(engine._reference_checks('dc', values, near, 'other model'))
        self.assertIsNone(engine._reference_checks('dc', dict(values, ce=100e-6), near, model))
        self.assertIsNone(engine._reference_checks('dc', dict(values, re=2000), near, model))

    def test_model_source_reports_custom_and_missing_files_truthfully(self):
        model = engine.inspect_model(self.model)
        self.assertEqual(model['status'], 'configured')
        self.assertEqual(model['source'], 'Project-configured SPICE file')
        self.assertFalse(model['reference'])
        missing = engine.inspect_model(self.model.with_name('missing.lib'))
        self.assertEqual(missing['status'], 'unavailable')
        self.assertIsNone(missing['fingerprint'])
        self.assertNotIn(str(self.model.parent), missing['detail'])

    def test_empty_model_is_unavailable(self):
        self.model.write_text('  \n', encoding='ascii')
        self.assertEqual(engine.inspect_model(self.model)['status'], 'unavailable')
        with self.assertRaisesRegex(engine.SpiceError, 'model file is empty'):
            engine.simulate('dc', executable=sys.executable, model_path=self.model)


if __name__ == '__main__':
    unittest.main()
