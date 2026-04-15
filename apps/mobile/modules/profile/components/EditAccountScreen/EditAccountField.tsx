import { TextField, type TextFieldProps } from '../../../../shared/components/TextField';

interface EditAccountFieldProps extends TextFieldProps {}

export function EditAccountField({ containerClassName, ...props }: EditAccountFieldProps) {
  const nextContainerClassName = ['mt-5', containerClassName].filter(Boolean).join(' ');

  return <TextField containerClassName={nextContainerClassName} {...props} />;
}
