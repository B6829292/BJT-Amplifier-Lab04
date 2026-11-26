import os
import json
import re
import subprocess
import unittest
from unittest.mock import patch

from app import app
from spice_engine import SpiceError


class SimulationWebTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.values = dict(vcc='12', r1='100', r2='22', rc='2.2', re='1',
                           rl='10', cin='10', cout='10')

    def test_page_shows_separate_dc_form_and_defaults(self):
        response = self.client.get('/simulation')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('DC Operating Point', body)
        self.assertIn('value="100"', body)
        self.assertIn('id="device-model-status"', body)
        self.assertNotIn('Simulation successful', body)

    def test_dashboard_offers_circuit_and_all_bias_modes(self):
        body = self.client.get('/simulation').get_data(as_text=True)
        for value in ('Circuit Schematic', 'Circuit Configuration', 'Bias Selection',
                      '/?mode=fixed', '/?mode=emitter', '/?mode=divider', 'Emitter Bypass'):
            self.assertIn(value, body)

    def test_result_dashboard_identifies_unrun_analyses_honestly(self):
        body = self.client.get('/simulation').get_data(as_text=True)
        for value in ('DC Operating Point', 'AC Response', 'Transient Response', 'Validation', 'Not run'):
            self.assertIn(value, body)
        self.assertNotIn('All tests passed', body)

    def test_analytical_navigation_selects_requested_bias(self):
        body = self.client.get('/?mode=fixed').get_data(as_text=True)
        self.assertRegex(body, r'<option value="fixed"\s+selected')

    def test_bias_navigation_respects_application_prefix(self):
        body = self.client.get('/simulation', environ_overrides={'SCRIPT_NAME': '/lab'}).get_data(as_text=True)
        self.assertIn('href="/lab/?mode=fixed"', body)
        self.assertIn('href="/lab/?mode=emitter"', body)
        self.assertIn('href="/lab/?mode=divider"', body)

    def test_favicon_endpoint_serves_local_image(self):
        response = self.client.get('/favicon.ico')
        self.addCleanup(response.close)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'image/svg+xml')
        self.assertIn(b'<svg', response.data)

    def test_enhanced_run_returns_real_engine_payload_and_inputs(self):
        actual = {'vb': 2.1, 'netlist': 'engine netlist', 'log': 'engine log'}
        with patch('app.spice_engine.simulate', return_value=actual):
            response = self.client.post('/simulation', data=self.values, headers={'Accept': 'application/json'})
        data = response.get_json()
        self.assertEqual(data['result'], actual)
        self.assertEqual(data['inputs']['re'], '1')
        self.assertEqual(data['mode'], 'dc')
        with patch('app.spice_engine.simulate', side_effect=SpiceError('Unavailable')):
            failed = self.client.post('/simulation', data=self.values, headers={'Accept': 'application/json'}).get_json()
        self.assertIsNone(failed['result'])
        self.assertEqual(failed['error'], 'Unavailable')

    def test_bypass_control_selects_the_real_topology(self):
        headers = {'Accept': 'application/json'}
        for mode in ('dc', 'ac', 'tran'):
            with self.subTest(analysis=mode), patch('app.spice_engine.simulate', return_value={}) as solver:
                data = self.client.post('/simulation', data=dict(self.values, analysis=mode,
                                        emitter_bypass='on', ce='47'), headers=headers).get_json()
                self.assertIsNone(data['error'])
                self.assertEqual(data['inputs']['emitter_bypass'], 'on')
                self.assertAlmostEqual(solver.call_args.args[1]['ce'], 47e-6)

        with patch('app.spice_engine.simulate', return_value={}) as solver:
            data = self.client.post('/simulation', data=dict(self.values, ce='invalid'), headers=headers).get_json()
            self.assertIsNone(data['error'])
            self.assertEqual(data['inputs']['emitter_bypass'], 'off')
            self.assertNotIn('ce', solver.call_args.args[1])

    def test_bypass_rejects_invalid_switch_or_capacitance_before_running(self):
        headers = {'Accept': 'application/json'}
        for state, ce in [('invalid', '100'), ('on', ''), ('on', '0'), ('on', 'nan')]:
            with self.subTest(state=state, ce=ce), patch('app.spice_engine.simulate', return_value={'analysis': 'dc'}) as solver:
                data = self.client.post('/simulation', data=dict(self.values, emitter_bypass=state, ce=ce),
                                        headers=headers).get_json()
                self.assertIsNone(data['result'])
                self.assertRegex(data['error'], r'Emitter bypass|CE:')
                solver.assert_not_called()

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Requires local BJT model and ngspice')
    def test_native_form_supports_bypass_without_javascript(self):
        body = self.client.post('/simulation', data=dict(self.values, emitter_bypass='on', ce='100')).get_data(as_text=True)
        self.assertIn('data-emitter-bypass visibility="visible"', body)
        self.assertIn('CE e 0 0.0001', body)

    def test_analytical_modes_share_dashboard_navigation(self):
        for mode in ('fixed', 'emitter', 'divider'):
            body = self.client.get('/?mode=' + mode).get_data(as_text=True)
            self.assertIn('class="lab-page analytical-page"', body)
            self.assertIn('Bias Selection', body)
            self.assertIn('Circuit Configuration', body)

    def test_wrapped_phase_has_no_connected_wrap_boundary(self):
        result = subprocess.run(['node', 'tests/plot_wrap_check.js'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_retained_runs_mark_changed_inputs_stale(self):
        result = subprocess.run(['node', 'tests/run_history_check.js'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_signal_controls_in_sidebar_keep_simulation_form_association(self):
        body = self.client.get('/simulation').get_data(as_text=True)
        sidebar = body.split('<aside class="lab-sidebar"', 1)[1].split('</aside>', 1)[0]
        for field in ('amplitude', 'frequency'):
            self.assertRegex(sidebar, rf'<input[^>]+id="spice-{field}"[^>]+form="spice-form"')
            self.assertRegex(sidebar, rf'<select[^>]+id="unit-{field}"[^>]+form="spice-form"')
        self.assertEqual(body.count('id="spice-amplitude"'), 1)
        self.assertEqual(body.count('id="spice-frequency"'), 1)

    def test_generator_units_convert_to_identical_si_values(self):
        headers = {'Accept': 'application/json'}
        cases = [('10', 'mV', '1000', 'Hz'), ('0.01', 'V', '1', 'kHz'), ('10000', 'uV', '0.001', 'MHz')]
        for amplitude, amplitude_unit, frequency, frequency_unit in cases:
            with self.subTest(amplitude_unit=amplitude_unit, frequency_unit=frequency_unit), \
                    patch('app.spice_engine.simulate', return_value={'analysis':'tran'}) as solver:
                data = self.client.post('/simulation', headers=headers, data=dict(self.values, analysis='tran',
                    amplitude=amplitude, amplitude_unit=amplitude_unit, frequency=frequency, frequency_unit=frequency_unit)).get_json()
                self.assertIsNone(data['error'])
                self.assertEqual(data['inputs']['amplitude_unit'], amplitude_unit)
                self.assertEqual(data['inputs']['frequency_unit'], frequency_unit)
                numbers = solver.call_args.args[1]
                self.assertAlmostEqual(numbers['amplitude'], 0.01, places=12)
                self.assertEqual(numbers['frequency'], 1000)

    def test_invalid_source_unit_does_not_reach_the_solver(self):
        frozen = dict(self.values, analysis='tran', amplitude='10', amplitude_unit='length')
        with patch('app.spice_engine.simulate', return_value={'analysis':'tran'}) as solver:
            data = self.client.post('/simulation', data=frozen, headers={'Accept': 'application/json'}).get_json()
            self.assertIn('Input amplitude: choose a valid unit.', data['error'])
            self.assertIsNone(data['result'])
            solver.assert_not_called()

    def test_validation_provenance_separates_evidence_from_status(self):
        body = self.client.get('/simulation').get_data(as_text=True)
        for label in ('Device model', 'Model source', 'Model status', 'Reference benchmark'):
            self.assertIn(label, body)
        self.assertIn('Not run', body)
        self.assertNotRegex(body, r'(?i)instructor(?:[ -]verified| validation)')
        self.assertIn('validation-row', body)

    def test_missing_model_has_explicit_template_and_response_metadata(self):
        with patch.dict(os.environ, {'BJT_MODEL_PATH': ''}):
            page = self.client.get('/simulation').get_data(as_text=True)
            self.assertIn('id="device-model-status" data-state="unavailable"', page)
            response = self.client.post('/simulation', data=self.values, headers={'Accept': 'application/json'}).get_json()
            self.assertIsNone(response['result'])
            self.assertEqual(response['model_info']['status'], 'unavailable')
            self.assertIn('BJT_MODEL_PATH', response['model_info']['detail'])

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Requires local BJT model and ngspice')
    def test_successful_model_metadata_matches_the_model_actually_loaded(self):
        page = self.client.get('/simulation').get_data(as_text=True)
        self.assertIn('id="device-model-status" data-state="configured"', page)
        data = self.client.post('/simulation', data=self.values, headers={'Accept': 'application/json'}).get_json()
        self.assertEqual(data['model_info'], data['result']['model_info'])
        self.assertEqual(data['model_info']['device'], '2N3904')
        self.assertEqual(data['model_info']['status'], 'loaded')
        self.assertRegex(data['model_info']['fingerprint'], r'^[0-9a-f]{64}$')
        self.assertNotIn(os.environ['BJT_MODEL_PATH'], json.dumps(data['model_info']))
        if data['model_info']['reference']:
            self.assertTrue(all(item['passed'] for item in data['result']['reference_checks']))

    def test_spice_decimal_notation_contract_for_freshness(self):
        headers = {'Accept': 'application/json'}
        for value in ('0x64', '0b1100100', '0o144', '1__00', '_100', '100_'):
            with self.subTest(value=value), patch('app.spice_engine.simulate') as solver:
                data = self.client.post('/simulation', data=dict(self.values, r1=value), headers=headers).get_json()
                self.assertIn('R1:', data['error'])
                self.assertIsNone(data['result'])
                solver.assert_not_called()
        for value in ('100.0', '1e2', '  +1_0_0.0  ', '1_0e+1'):
            with self.subTest(value=value), patch('app.spice_engine.simulate', return_value={'analysis': 'dc'}) as solver:
                data = self.client.post('/simulation', data=dict(self.values, r1=value), headers=headers).get_json()
                self.assertIsNone(data['error'])
                self.assertEqual(solver.call_args.args[1]['r1'], 100000)

    def test_invalid_values_are_rejected_without_success(self):
        for key, value in [('re', '0'), ('cin', 'nan'), ('r1', '1e999'), ('vcc', '')]:
            with self.subTest(key=key):
                body = self.client.post('/simulation', data=dict(self.values, **{key: value})).get_data(as_text=True)
                self.assertIn('Error', body)
                self.assertNotIn('Simulation successful', body)
                self.assertNotIn('id="spice-results"', body)

    def test_engine_failure_never_renders_success_or_previous_result(self):
        with patch('app.spice_engine.simulate', side_effect=SpiceError('2N3904 model not found')):
            body = self.client.post('/simulation', data=self.values).get_data(as_text=True)
        self.assertIn('2N3904 model not found', body)
        self.assertNotIn('Simulation successful', body)
        self.assertNotIn('id="spice-results"', body)

    def test_unknown_analysis_is_rejected(self):
        body = self.client.post('/simulation', data=dict(self.values, analysis='invalid')).get_data(as_text=True)
        self.assertIn('Error', body)
        self.assertNotIn('Simulation successful', body)
        self.assertNotIn('id="plot-data"', body)

    def test_invalid_transient_source_is_rejected(self):
        for field, value in [('amplitude', '0'), ('frequency', 'nan'), ('frequency', '')]:
            data = dict(self.values, analysis='tran', amplitude='10', frequency='1000')
            data[field] = value
            body = self.client.post('/simulation', data=data).get_data(as_text=True)
            self.assertIn('Error', body)
            self.assertNotIn('id="plot-data"', body)

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Requires local BJT model and ngspice')
    def test_real_ac_and_transient_data_reach_page(self):
        def run(analysis, amplitude='10'):
            body = self.client.post('/simulation', data=dict(self.values, analysis=analysis,
                                    amplitude=amplitude, frequency='1000')).get_data(as_text=True)
            self.assertIn('Simulation successful', body)
            match = re.search(r'<script id="plot-data" type="application/json">(.*?)</script>', body, re.S)
            self.assertIsNotNone(match)
            return json.loads(match.group(1))
        ac = run('ac')
        i = ac['frequency_hz'].index(1000.0)
        self.assertAlmostEqual(ac['gain_db'][i], 4.88959, places=3)
        self.assertAlmostEqual(ac['phase_deg'][i], -179.871, places=2)
        a, b = run('tran'), run('tran', '20')
        self.assertAlmostEqual(max(b['vin_v']) / max(a['vin_v']), 2, delta=.05)
        self.assertGreater(len(a['time_s']), 50)

    @unittest.skipUnless(os.environ.get('BJT_MODEL_PATH'), 'Requires local BJT model and ngspice')
    def test_real_dc_and_changed_emitter_resistor(self):
        body = self.client.post('/simulation', data=self.values).get_data(as_text=True)
        for value in ('Simulation successful', '2.0037 V', '1.3329 V', '9.0872 V',
                      '7.7543 V', '1.3240 mA'):
            self.assertIn(value, body)
        changed = self.client.post('/simulation', data=dict(self.values, re='2')).get_data(as_text=True)
        self.assertIn('Simulation successful', changed)
        self.assertNotIn('1.3240 mA', changed)


if __name__ == '__main__':
    unittest.main()
