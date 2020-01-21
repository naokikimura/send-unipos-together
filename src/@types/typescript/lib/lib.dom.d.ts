
type USVString = string;
type DOMString = string;
type FormValue = File | USVString | FormData | null;

declare interface ElementInternals {
  readonly form: HTMLFormElement;
  readonly labels :NodeList;
  readonly validationMessage: DOMString;
  readonly validity: ValidityState;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setFormValue(value: FormValue, state?: FormValue): void;
  setValidity(flags: ValidityStateFlags, message?: DOMString, anchor?: HTMLElement): void;
}

declare interface ValidityStateFlags {
  valueMissing?: boolean;
  typeMismatch?: boolean;
  patternMismatch?: boolean;
  tooLong?: boolean;
  tooShort?: boolean;
  rangeUnderflow?: boolean;
  rangeOverflow?: boolean;
  stepMismatch?: boolean;
  badInput?: boolean;
  customError?: boolean;
}
