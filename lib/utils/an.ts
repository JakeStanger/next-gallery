/**
 * Appends `a ` or `an ` to the start of a string,
 * based on the first letter of the string.
 *
 * This does not even attempt to interpret or handle
 * different sounds so it's going to get things wrong.
 *
 * @param string
 * @param upper
 */
function an(string: string, upper = true) {
  if (/^[aeiou]/i.test(string)) {
    return `${upper ? 'An' : 'an'} ${string}`;
  } else {
    return `${upper ? 'A' : 'a'} ${string}`;
  }
}

export default an;
