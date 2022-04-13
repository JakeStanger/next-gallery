import React, { useCallback } from 'react';
import styles from './FormField.module.scss';
import IFormFieldProps from './IFormFieldProps';
import TextField from '@mui/material/TextField';
import AsyncChoice from './asyncChoice/AsyncChoice';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DateTimePicker from '@mui/lab/DateTimePicker';

const FormField: React.FC<IFormFieldProps> = (props) => {
  const { field, value, type, label, onChange, choices } = props;

  const onFieldChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ value: (ev.target as HTMLInputElement).value, field });
    },
    [onChange, field]
  );

  switch (type) {
    case 'text':
    case 'textLong':
      return (
        <TextField
          label={label}
          value={value ?? ''}
          onChange={onFieldChange}
          multiline={type === 'textLong'}
          rows={16}
          variant='outlined'
        />
      );
    case 'choice':
      if (!choices) {
        throw new Error('You must pass choices prop for a choice field');
      }

      if (Array.isArray(choices)) {
        return (
          <FormControl variant={'outlined'}>
            <InputLabel htmlFor={field} className={styles.label}>
              {label}
            </InputLabel>
            <Select
              id={field}
              value={value?.id ?? value}
              onChange={(ev) => {
                const value = choices.find(
                  (choice) => choice.id === ev.target.value
                );
                onChange({ value, field });
              }}
            >
              {choices.map((choice) => (
                <MenuItem key={choice.id} value={choice.id}>
                  {choice.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      } else {
        return <AsyncChoice {...props} model={choices.endpoint} />;
      }

    case 'choiceMulti':
      if (!choices) {
        throw new Error('You must pass choices prop for a choice field');
      }

      if (Array.isArray(choices)) {
        const valueIds =
          value?.map(
            (item: { id: number } | number) =>
              (item as { id: number }).id ?? item
          ) ?? [];

        return (
          <FormControl variant={'outlined'}>
            <InputLabel htmlFor={field} className={styles.label}>
              {label}
            </InputLabel>
            <Select
              fullWidth
              id={field}
              multiple
              value={valueIds ?? []}
              onChange={(ev) => {
                const value = (ev.target.value as number[]).map((v) =>
                  choices.find((choice) => choice.id === v)
                );

                onChange({ value, field });
              }}
              renderValue={(val) =>
                (val as number[])
                  .map((item) => choices.find((c) => c.id === item)!.name)
                  .join(', ')
              }
            >
              {choices.map((choice) => (
                <MenuItem key={choice.id} value={choice.id}>
                  <Checkbox checked={valueIds.indexOf(choice.id) > -1} />
                  <ListItemText primary={choice.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      } else {
        return <AsyncChoice {...props} model={choices.endpoint} />;
      }
    case 'integer':
    case 'float':
      return (
        <TextField
          type={'number'}
          label={label}
          value={value ?? ''}
          onChange={onFieldChange}
          variant='outlined'
          inputProps={{
            min: 0,
            step: type === 'float' ? 0.001 : 1,
          }}
        />
      );
    case 'datetime':
      return (
        <DateTimePicker
          label={label}
          // @ts-ignore TODO: Remove once typing issues resolved
          renderInput={(props) => <TextField variant="outlined" {...props} />}
          value={value}
          onChange={(newValue) => onChange({ value: newValue, field })}
          ampm={false}
          inputFormat={'dd MMMM yyyy T'}
        />
      );
  }
};

export default FormField;
