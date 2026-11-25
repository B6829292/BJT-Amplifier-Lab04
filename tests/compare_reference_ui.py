"""Development-only, reproducible static-region comparison. Requires Pillow.

Not a perceptual similarity score. Dynamic values, traces, model/topology controls,
validation results and intentional Lab04 branding badges are not measured.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance, ImageStat


def compare(reference, capture_dir):
    original = Image.open(reference).convert('RGB')
    rendered = Image.open(capture_dir / 'dashboard-1085.png').convert('RGB')
    if original.size != (1085, 613) or rendered.size != original.size:
        raise ValueError('Comparison requires exact 1085×613 reference and viewport capture.')
    regions = {
        'branding': (15, 14, 280, 48),
        'navigation': (18, 62, 156, 163),
        'schematic_tabs': (176, 89, 417, 116),
        'configuration_heading': (739, 60, 1060, 90),
        'results_heading': (176, 386, 504, 413),
    }
    measurements = []
    for name, box in regions.items():
        delta = ImageChops.difference(original.crop(box), rendered.crop(box))
        channels = ImageStat.Stat(delta).mean
        measurements.append(dict(region=name, box=box, mean_absolute_rgb_error=sum(channels)/3,
                                 channels=channels))
    side = Image.new('RGB', (2170, 613), 'white')
    side.paste(original, (0, 0))
    side.paste(rendered, (1085, 0))
    side.save(capture_dir / 'comparison.png')
    Image.blend(original, rendered, .5).save(capture_dir / 'overlay.png')
    ImageEnhance.Contrast(ImageChops.difference(original, rendered)).enhance(3).save(capture_dir / 'difference.png')
    result = dict(reference_dimensions=original.size, method='Mean absolute RGB channel error (0–255), fixed matching coordinates; lower is closer. No rescaling or registration. Not a perceptual similarity score.',
                  exclusions='Electrical values, waveform/chart data, unsupported engineering controls, validation states, Lab04 identity badge and project text.',
                  regions=measurements)
    (capture_dir / 'comparison.json').write_text(json.dumps(result, indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--reference', required=True, type=Path)
    parser.add_argument('--capture-dir', type=Path, default=Path('docs/evidence/reference-ui'))
    args = parser.parse_args()
    compare(args.reference, args.capture_dir)
