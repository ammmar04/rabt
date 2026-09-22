/** A field's validation message, tied to the field for screen readers. */
export default function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return <span className="field__error" id={id} role="alert">{message}</span>;
}
