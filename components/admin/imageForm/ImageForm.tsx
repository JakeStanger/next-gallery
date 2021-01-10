import React, { useCallback, useReducer } from 'react';
import styles from './ImageForm.module.scss';
import IImageFormProps from './IImageFormProps';
import FormField from './formField/FormField';
import FullImage from '../../../lib/types/FullImage';
import IFormFieldProps, { FieldTypes } from './formField/IFormFieldProps';
import { Button } from '@material-ui/core';
import processImageReqBody from '../../../lib/api/processors/processImageReqBody';

function handleChange(
  state: Partial<FullImage>,
  change: { field: keyof FullImage; value: any } | 'clear'
): Partial<FullImage> {
  if (change === 'clear') {
    return {};
  }

  return {
    ...state,
    [change.field]: change.value,
  };
}

const ImageForm: React.FC<IImageFormProps> = ({
  image,
  categories,
  priceGroups,
  onSave,
  initialName,
  showExif,
}) => {
  const [editValues, onChange] = useReducer(handleChange, {
    name: initialName,
  });

  const saveForm = useCallback(async () => {
    const saveValues = processImageReqBody(image.id!, editValues);

    await onSave(saveValues);
  }, [image, editValues]);

  const clearForm = useCallback(() => {
    onChange('clear');
  }, []);

  const getValue = useCallback(
    (field: keyof FullImage) => {
      return editValues[field] ?? image[field];
    },
    [image, editValues]
  );

  const fieldProps = useCallback(
    (
      label: string,
      field: keyof FullImage,
      type: FieldTypes
    ): IFormFieldProps => {
      return {
        label,
        field,
        type,
        onChange,
        value: getValue(field),
      };
    },
    [getValue]
  );

  return (
    <div className={styles.form}>
      <div className={styles.fieldGroup}>
        <div className={styles.header}>General Information</div>
        <FormField {...fieldProps('Name', 'name', 'text')} />
        <FormField {...fieldProps('Description', 'description', 'textLong')} />
        <FormField
          {...fieldProps('Categories', 'categories', 'choiceMulti')}
          choices={categories}
        />
        <FormField
          {...fieldProps('Location', 'location', 'choice')}
          choices={{ endpoint: 'location' }}
        />
        <FormField
          {...fieldProps('Price Group', 'priceGroup', 'choice')}
          choices={priceGroups}
        />
        {image.id && (
          <FormField
            {...fieldProps('Group', 'group', 'choice')}
            choices={{ endpoint: 'group' }}
          />
        )}
        <FormField
          {...fieldProps('Tags', 'tags', 'choiceMulti')}
          choices={{ endpoint: 'tag' }}
        />
      </div>
      {showExif !== false && (
        <div className={styles.fieldGroup}>
          <div className={styles.header}>EXIF Data</div>
          <FormField {...fieldProps('Time Taken', 'timeTaken', 'datetime')} />
          <FormField {...fieldProps('ISO', 'iso', 'integer')} />
          <FormField {...fieldProps('Exposure', 'exposure', 'float')} />
          <FormField {...fieldProps('Aperture', 'aperture', 'integer')} />
          <FormField
            {...fieldProps('Focal Length', 'focalLength', 'integer')}
          />
          <FormField
            label={'Camera Model'}
            field={'cameraModel'}
            value={getValue('cameraModel')}
            type={'text'}
            onChange={onChange}
          />
        </div>
      )}
      <div className={styles.buttons}>
        <Button variant='contained' color='primary' onClick={saveForm}>
          {image.id ? 'Save Changes' : 'Upload Image'}
        </Button>
        {image.id && (
          <Button variant='contained' color='secondary' onClick={clearForm}>
            Undo Changes
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageForm;
