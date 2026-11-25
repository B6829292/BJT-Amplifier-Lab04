import unittest
import subprocess
import json
import math
from app import SPICE_FIELDS
from spice_engine import _parameters
from app import app


class ReferenceUITests(unittest.TestCase):
    def setUp(self):
        self.body = app.test_client().get('/simulation').get_data(as_text=True)

    def test_reference_controls_are_accessible(self):
        for control in ('overlay-dc', 'overlay-ac', 'overlay-animation', 'reset-lab',
                        'export-results', 'validate-lab', 'pause-animation'):
            with self.subTest(control=control):
                self.assertIn(f'id="{control}"', self.body)

    def test_generator_has_two_accessible_rotary_controls(self):
        self.assertIn('role="slider"', self.body)
        self.assertIn('data-knob="amplitude"', self.body)
        self.assertIn('data-knob="frequency"', self.body)

    def test_unsupported_bypass_is_not_an_active_solver_input(self):
        self.assertIn('Emitter bypass', self.body)
        self.assertIn('not supported', self.body)
        self.assertNotIn('name="ce"', self.body)

    def test_editable_schematic_and_no_reference_background(self):
        self.assertIn('id="circuit-svg"', self.body)
        self.assertNotIn('final-project-reference.png', self.body)

    def test_native_form_defaults_to_supported_dc_analysis(self):
        self.assertRegex(self.body, r'<option value="dc"\s+selected')

    def test_frontend_decimal_parser_matches_engine_notation(self):
        result = subprocess.run(['node', 'tests/reference_decimal_check.js'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_frontend_bounds_match_existing_engine_limits(self):
        result = subprocess.run(['node', '-e', "console.log(JSON.stringify(require('./static/lab-parameters.js').rules))"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        factors={key:factor for key, _, _, _, factor in SPICE_FIELDS}
        factors.update(amplitude=.001,frequency=1)
        for key, rule in json.loads(result.stdout).items():
            self.assertEqual(rule['factor'],factors[key])
            for value in (rule['min'], rule['max']):
                with self.subTest(key=key,value=value):
                    self.assertEqual(_parameters({key:value})[key],value)
            for value in (math.nextafter(rule['min'], -math.inf), math.nextafter(rule['max'], math.inf)):
                with self.subTest(key=key,value=value), self.assertRaises(ValueError):
                    _parameters({key:value})


if __name__ == '__main__':
    unittest.main()
