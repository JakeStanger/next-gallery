import React from 'react';
import IAsyncChoiceProps from './IAsyncChoiceProps';
import { Autocomplete } from '@material-ui/lab';
import { throttle } from 'lodash';
import TextField from '@material-ui/core/TextField';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';

const AsyncChoice: React.FC<IAsyncChoiceProps> = ({
  model,
  label,
  field,
  value,
  onChange,
  type,
}) => {
  const isMulti = type === 'choiceMulti';

  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<any[]>([]);

  const fetchOptions = React.useMemo(
    () =>
      throttle((input: string, callback: (results?: any[]) => void) => {
        fetch(`/api/${model}?$search=${input}&$top=10`)
          .then((r) => r.json())
          .then((r) => callback(r.data));
      }, 200),
    []
  );

  React.useEffect(() => {
    let active = true;

    if (inputValue.length <= 1) {
      setOptions([]);
      return undefined;
    }

    fetchOptions(inputValue, (results?: any[]) => {
      if (active) {
        let newOptions: any[] = [];

        if (value) {
          newOptions = type === 'choiceMulti' ? value : [value];
        }

        if (results) {
          newOptions = [...newOptions, ...results];
        }

        setOptions(
          newOptions.filter((option) =>
            !isMulti ? option.id !== value?.id : true
          )
        );
      }
    });

    return () => {
      active = false;
    };
  }, [value, inputValue, fetchOptions]);

  return (
    <Autocomplete
      multiple={isMulti}
      freeSolo
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.name
      }
      onChange={(_event: any, newValue: any | null) => {
        if (isMulti) {
          newValue = newValue.map((item: string | {name: string}) => {
            if (typeof item === 'string') {
              return { name: item };
            }
            return item;
          });
        } else {
          if (typeof newValue === 'string') {
            newValue = { name: newValue };
          }
        }
        onChange({ value: newValue, field });
      }}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} variant='outlined' fullWidth />
      )}
      renderOption={(option, { inputValue }) => {
        const matches = match(option.name, inputValue);
        const parts = parse(option.name, matches);

        return (
          <div>
            {parts.map((part, index) => (
              <span
                key={index}
                style={{ fontWeight: part.highlight ? 700 : 400 }}
              >
                {part.text}
              </span>
            ))}
          </div>
        );
      }}
      value={value}
      options={options}
    />
  );
};

export default AsyncChoice;
