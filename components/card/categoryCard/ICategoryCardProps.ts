import ExpandedCategory from '../../../lib/types/ExpandedCategory';
import ExpandedImage from '../../../lib/types/ExpandedImage';

interface ICategoryCardProps {
  category: ExpandedCategory;
  thumbnail: ExpandedImage;

  isSelected: boolean;
  onSelect: (category: ExpandedCategory) => void;
}

export default ICategoryCardProps;
