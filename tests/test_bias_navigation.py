import re
import unittest

from app import app


class BiasNavigationTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_all_bias_routes_render_the_same_shell(self):
        routes = ('/', '/?mode=fixed', '/?mode=emitter', '/?mode=divider', '/simulation')
        for route in routes:
            with self.subTest(route=route):
                body = self.client.get(route).get_data(as_text=True)
                for component in ('lab-compact.css', 'lab-header', 'lab-sidebar',
                                  'schematic-panel', 'config-panel', 'config-fields',
                                  'results-heading', 'run-panel', 'validation-panel'):
                    self.assertTrue(component in body, f'{route} is missing {component}')

    def test_selected_bias_and_project_information_agree(self):
        routes = {
            '/': ('divider', 'Lab03', 'Voltage Divider Bias'),
            '/?mode=fixed': ('fixed', 'Lab03', 'Fixed Bias'),
            '/?mode=emitter': ('emitter', 'Lab03', 'Emitter Bias (Unbypassed)'),
            '/?mode=divider': ('divider', 'Lab03', 'Voltage Divider Bias'),
            '/simulation': ('simulation', 'Lab04', 'Voltage Divider Bias'),
        }
        for route, (mode, lab, label) in routes.items():
            with self.subTest(route=route):
                body = self.client.get(route).get_data(as_text=True)
                selected = re.findall(r'<a data-bias-link="([^"]+)"[^>]+aria-current="page"', body)
                self.assertEqual(selected, [mode])
                self.assertIn(f'ENG29 2121 – {lab}', body)
                self.assertTrue(f'id="project-bias">{label}</span>' in body, f'Incorrect project bias at {route}')

    def test_analytical_mode_post_keeps_appropriate_controls_and_result(self):
        body = self.client.post('/?mode=emitter', data={
            'mode': 'emitter', 'vcc': '12', 'rb': '1000', 'rc': '2.2',
            're': '1', 'beta': '100', 'vbe': '0.7',
        }).get_data(as_text=True)
        self.assertTrue('id="project-bias">Emitter Bias (Unbypassed)</span>' in body, 'Incorrect project bias after POST')
        self.assertIn('1.0263 mA', body)
        self.assertIn('8.7054 V', body)
        self.assertIn('id="result-status"', body)
        for control in ('spice-form', 'run-ac', 'run-tran', 'source-fields'):
            self.assertNotIn(f'id="{control}"', body)
