import prisma from '../../../../lib/prisma';

export type FieldTypes =
  | 'text'
  | 'textLong'
  | 'choice'
  | 'choiceMulti'
  | 'integer'
  | 'float'
  | 'datetime';

export type Endpoint = 'location' | 'group' | 'tag';

interface IFormFieldProps {
  label: string;
  field: string;
  value: any;
  type: FieldTypes;
  onChange: (data: { value: any; field: string }) => void;
  choices?: { endpoint: Endpoint } | any[];
}

export default IFormFieldProps;
