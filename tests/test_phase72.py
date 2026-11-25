import subprocess
import unittest
from app import app


class Phase72Tests(unittest.TestCase):
    def test_reference_specific_bias_icons_replace_generic_network_icons(self):
        body=app.test_client().get('/simulation').get_data(as_text=True)
        for name in ('ce-reference','bias-fixed','bias-emitter','bias-divider'):
            self.assertIn('data-icon="'+name+'"',body)

    def test_signal_motion_uses_actual_samples_and_shared_time(self):
        result=subprocess.run(['node','tests/schematic_motion_check.js'],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_circuit_overlays_use_separate_continuous_current_and_signal_paths(self):
        body = app.test_client().get('/simulation').get_data(as_text=True)
        self.assertIn('id="current-glow"', body)
        self.assertIn('id="emitter-resistor"', body)
        self.assertIn('id="emitter-ground-lead"', body)
        current = body.split('<g class="dc-current"', 1)[1].split('</g>', 1)[0]
        self.assertEqual(current.count('marker-end="url(#arrow-orange)"'), 4)
        self.assertEqual(current.count('data-current-arrow="collector"'), 2)
        self.assertEqual(current.count('data-current-arrow="emitter"'), 2)
        self.assertNotIn('flow-path', current)
        self.assertIn('schematic-motion.js', body)

    def test_reference_schematic_has_distinct_electrical_symbols_and_motion_tracks(self):
        body = app.test_client().get('/simulation').get_data(as_text=True)
        for symbol in ('divider-upper', 'divider-lower', 'collector-resistor',
                       'input-capacitor', 'output-capacitor', 'load-resistor', 'npn-symbol'):
            self.assertTrue(f'id="{symbol}"' in body, f'Missing schematic symbol: {symbol}')
        for branch in ('collector', 'emitter', 'input', 'output'):
            self.assertTrue(f'data-pulse="{branch}"' in body, f'Missing directional pulse: {branch}')
        self.assertTrue('class="schematic-subscript"' in body, 'Engineering symbols use real subscripts')
        self.assertNotIn('id="emitter-bypass-capacitor"', body)
