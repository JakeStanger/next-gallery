import prisma from '../../../../lib/prisma';

export type FieldTypes =
  | 'text'
  | 'textLong'
  | 'choice'
  | 'choiceMulti'
  | 'integer'
  | 'float'
  | 'datetime';

interface IFormFieldProps {
  label: string;
  field: string;
  value: any;
  type: FieldTypes;
  onChange: (data: { value: any; field: string }) => void;
  choices?: { endpoint: keyof typeof prisma } | any[];
}

export default IFormFieldProps;
