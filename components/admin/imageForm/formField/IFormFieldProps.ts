import prisma from '../../../../lib/prisma';
import FullImage from '../../../../lib/types/FullImage';

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
  field: keyof FullImage;
  value: any;
  type: FieldTypes;
  onChange: (data: { value: any; field: keyof FullImage }) => void;
  choices?: { endpoint: keyof typeof prisma } | any[];
}

export default IFormFieldProps;
