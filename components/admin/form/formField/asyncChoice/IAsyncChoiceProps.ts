import prisma from '../../../../../lib/prisma';
import IFormFieldProps from '../IFormFieldProps';

interface IAsyncChoiceProps extends IFormFieldProps {
  model: keyof typeof prisma;
}

export default IAsyncChoiceProps;
