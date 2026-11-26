from decimal import Decimal, InvalidOperation
import math

from flask import Flask, jsonify, render_template, request, send_from_directory

from dc_bias import _multiply, _normal, calculate_bias, calculate_fixed_bias, calculate_emitter_bias
import spice_engine

app = Flask(__name__)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.static_folder, 'favicon.svg', mimetype='image/svg+xml')


FIELDS = ('vcc', 'r1', 'r2', 'rc', 're', 'beta', 'vbe')
DEFAULTS = dict(zip(FIELDS, ('12', '100', '22', '2.2', '1', '100', '0.7')))
DEFAULTS['rb'] = '1000'
ALL_FIELDS = (*FIELDS, 'rb')
MODE_FIELDS = {'divider': FIELDS, 'fixed': ('vcc', 'rb', 'rc', 'beta', 'vbe'),
               'emitter': ('vcc', 'rb', 'rc', 're', 'beta', 'vbe')}
MODE_LABELS = {'fixed': 'Fixed Bias', 'emitter': 'Emitter Bias (Unbypassed)',
               'divider': 'Voltage Divider Bias'}
UNIT_FACTORS = {'vcc': {'V': 1, 'mV': 0.001}, 'vbe': {'V': 1, 'mV': 0.001},
                **{key: {'ohm': 1, 'kohm': 1000, 'Mohm': 1000000} for key in ('r1', 'r2', 'rb', 'rc', 're')}}
DEFAULT_UNITS = {key: ('V' if key in ('vcc', 'vbe') else 'kohm') for key in UNIT_FACTORS}


@app.route('/', methods=['GET', 'POST'])
def index():
    mode = request.form.get('mode', 'divider') if request.method == 'POST' else request.args.get('mode', 'divider')
    if request.method == 'GET' and mode not in MODE_FIELDS:
        mode = 'divider'
    values = DEFAULTS.copy() if request.method == 'GET' else {
        key: request.form.get(key, '' if key in MODE_FIELDS.get(mode, ()) else DEFAULTS[key]) for key in ALL_FIELDS}
    units = {key: request.form.get(key + '_unit', default) if request.method == 'POST' else default
             for key, default in DEFAULT_UNITS.items()}
    result = error = None
    errors = {}
    if request.method == 'POST':
        numbers = {}
        if mode not in MODE_FIELDS:
            error = 'Error: Choose a valid bias mode.'
        for key in MODE_FIELDS.get(mode, ()):
            try:
                if not values[key].strip():
                    errors[key] = 'This field is required.'
                    continue
                decimal_value = Decimal(values[key])
                number = float(decimal_value)
                if not decimal_value.is_finite() or not math.isfinite(number):
                    errors[key] = 'Enter a finite number.'
                    continue
                numbers[key] = _normal(number, nonzero_expected=decimal_value.is_finite() and not decimal_value.is_zero())
                if key == 'vbe' and number < 0:
                    errors[key] = 'Enter zero or greater.'
                elif key != 'vbe' and number <= 0:
                    errors[key] = 'Enter a value greater than zero.'
                elif key in UNIT_FACTORS:
                    if units[key] not in UNIT_FACTORS[key]:
                        errors[key] = 'Choose a valid unit.'
                    else:
                        numbers[key] = _multiply(numbers[key], UNIT_FACTORS[key][units[key]])
                        if not math.isfinite(numbers[key]):
                            errors[key] = 'Value is too large after unit conversion.'
            except (ValueError, OverflowError, InvalidOperation) as exc:
                errors[key] = ('Value is too small for reliable calculation.' if 'too small' in str(exc)
                               else 'Enter a valid number.')
        if errors:
            error = 'Error: Correct the highlighted fields.'
        elif not error:
            try:
                if mode == 'divider':
                    result = calculate_bias(**numbers)
                elif mode == 'fixed':
                    result = calculate_fixed_bias(**numbers)
                elif mode == 'emitter':
                    result = calculate_emitter_bias(**numbers)
            except (ValueError, OverflowError) as exc:
                error = ('Error: Values are too small for reliable calculation.' if 'too small' in str(exc)
                         else 'Error: The combination of values is too large for reliable calculation.')
    return render_template('index.html', values=values, units=units, result=result, error=error, errors=errors,
                           analytical=True, mode=mode, mode_labels=MODE_LABELS, mode_fields=MODE_FIELDS)


SPICE_FIELDS = (
    ('vcc', 'VCC', 'V', '12', 1),
    ('r1', 'R1', 'kΩ', '100', 1000),
    ('r2', 'R2', 'kΩ', '22', 1000),
    ('rc', 'RC', 'kΩ', '2.2', 1000),
    ('re', 'RE', 'kΩ', '1', 1000),
    ('rl', 'RL', 'kΩ', '10', 1000),
    ('cin', 'Cin', 'µF', '10', 1e-6),
    ('cout', 'Cout', 'µF', '10', 1e-6),
)
BYPASS_FIELD = ('ce', 'CE', 'µF', '100', 1e-6)
SOURCE_UNITS = {
    'amplitude': {'mV': ('mV peak', 1e-3), 'V': ('V peak', 1), 'uV': ('µV peak', 1e-6)},
    'frequency': {'Hz': ('Hz', 1), 'kHz': ('kHz', 1e3), 'MHz': ('MHz', 1e6)},
}
SOURCE_UNIT_DEFAULTS = {key + '_unit': next(iter(units)) for key, units in SOURCE_UNITS.items()}


@app.route('/simulation', methods=['GET', 'POST'])
def simulation():
    analysis = request.form.get('analysis', 'dc') if request.method == 'POST' else 'dc'
    values = {key: default if request.method == 'GET' else request.form.get(key, '')
              for key, _, _, default, _ in SPICE_FIELDS}
    source_fields = (('amplitude', 'Input amplitude', 'mV peak', '10', 0.001),
                     ('frequency', 'Input frequency', 'Hz', '1000', 1))
    values.update({key: request.form.get(key, default) for key, _, _, default, _ in source_fields})
    values.update({key: request.form.get(key, default) for key, default in SOURCE_UNIT_DEFAULTS.items()})
    bypass = request.form.get('emitter_bypass', 'off')
    values['emitter_bypass'] = bypass
    values['ce'] = request.form.get('ce', '' if bypass == 'on' else BYPASS_FIELD[3])
    result = error = None
    if request.method == 'POST':
        try:
            if analysis not in ('dc', 'ac', 'tran'):
                raise ValueError('Choose a valid analysis mode.')
            if bypass not in ('off', 'on'):
                raise ValueError('Emitter bypass: choose Off or On.')
            fields = SPICE_FIELDS + ((BYPASS_FIELD,) if bypass == 'on' else ())
            if analysis == 'tran':
                fields += source_fields
            numbers = {}
            for key, label, _, _, factor in fields:
                if key in SOURCE_UNITS:
                    choice = SOURCE_UNITS[key].get(values[key + '_unit'])
                    if choice is None:
                        raise ValueError(f'{label}: choose a valid unit.')
                    _, factor = choice
                try:
                    value = float(values[key])
                except (ValueError, OverflowError):
                    raise ValueError(f'{label}: enter a finite positive number.') from None
                converted = value * factor
                if not math.isfinite(converted) or converted <= 0:
                    raise ValueError(f'{label}: enter a finite positive number.')
                numbers[key] = converted
            result = spice_engine.simulate(analysis, numbers)
        except (ValueError, spice_engine.SpiceError) as exc:
            error = str(exc)
    model_info = (result or {}).get('model_info') or spice_engine.inspect_model()
    if request.method == 'POST' and request.accept_mimetypes.best == 'application/json':
        return jsonify(mode=analysis, inputs=values, result=result, error=error, model_info=model_info)
    plot_data = None
    if result and analysis == 'ac':
        plot_data = {key: result[key] for key in ('frequency_hz', 'gain_db', 'phase_deg')}
    elif result and analysis == 'tran':
        plot_data = {key: result[key] for key in ('time_s', 'vin_v', 'vout_v')}
    return render_template('simulation.html', fields=SPICE_FIELDS, source_fields=source_fields,
                           bypass_field=BYPASS_FIELD, bypass_enabled=bypass == 'on',
                           source_units=SOURCE_UNITS, source_unit_defaults=SOURCE_UNIT_DEFAULTS,
                           values=values, analysis=analysis, plot_data=plot_data,
                           result=result, error=error, model_info=model_info, analytical=False,
                           mode='simulation', mode_labels=MODE_LABELS)
