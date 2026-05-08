// Mexican US consulate facility IDs.
// Find your IDs by opening the visa site, going to the reschedule page,
// and inspecting the facility dropdown's <option value="..."> attributes.
// Add IDs you discover here so messages show city names instead of numbers.
const FACILITY_NAMES = {
  '65': 'Ciudad Juarez',
  '66': 'Guadalajara',
  '67': 'Hermosillo',
  '68': 'Matamoros',
  '69': 'Merida',
  '70': 'Mexico City',
  '71': 'Monterrey',
  '72': 'Nogales',
  '73': 'Nuevo Laredo',
  '74': 'Tijuana',
};

export function getFacilityName(facilityId) {
  return FACILITY_NAMES[String(facilityId)] || `Facility ${facilityId}`;
}
