const weights = [7, 3, 1];

const charValue = (char) => {
  if (char === "<") return 0;
  if (/\d/.test(char)) return Number(char);
  return char.charCodeAt(0) - 55;
};

const checkDigit = (value) => String(value
  .split("")
  .reduce((sum, char, index) => sum + charValue(char) * weights[index % weights.length], 0) % 10);

export const makeSyntheticTd3 = ({
  passportField = "X1234567<",
  nationality = "UTO",
  birthDate = "900101",
  gender = "F",
  expiryDate = "300101",
  optionalData = "<<<<<<<<<<<<<<",
} = {}) => {
  const line1 = "P<UTOTESTER<<ALPHA".padEnd(44, "<");
  const passportCheck = checkDigit(passportField);
  const birthCheck = checkDigit(birthDate);
  const expiryCheck = checkDigit(expiryDate);
  const optionalCheck = checkDigit(optionalData);
  const line2WithoutComposite = `${passportField}${passportCheck}${nationality}${birthDate}${birthCheck}${gender}${expiryDate}${expiryCheck}${optionalData}${optionalCheck}`;
  const compositeValue = `${line2WithoutComposite.slice(0, 10)}${line2WithoutComposite.slice(13, 20)}${line2WithoutComposite.slice(21, 43)}`;
  return {
    line1,
    line2: `${line2WithoutComposite}${checkDigit(compositeValue)}`,
    expected: {
      passportNumber: passportField.replace(/<+$/g, ""),
      nationality,
      birthDate: "1990-01-01",
      gender,
      expiryDate: "2030-01-01",
      lastNameLatin: "TESTER",
      firstNameLatin: "ALPHA",
    },
  };
};

export const SYNTHETIC_TD3 = makeSyntheticTd3();
