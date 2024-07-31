import LoadingButton from '@mui/lab/LoadingButton';
import { TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import React, { forwardRef, useCallback, useRef } from 'react';
import { Controller } from 'react-hook-form';

const OptionComponent = forwardRef(({ option, index, showLoadingBelow, isLastItem, hasMore, ...props }, ref) => {
  return (
    <Box ref={ref} {...props}>
      {option !== null && option.label}
      {isLastItem && showLoadingBelow && hasMore && (
        <>
          Load more <LoadingButton loading={true} />
        </>
      )}
    </Box>
  );
});

export const LazySelectComp = ({
  options,
  loading,
  onFetchMore,
  hasMore,
  label,
  control,
  name,
  rules,
  onChangeovr,
  onControlChgOvr,
  onBlurovr,
  defaultValue,
  searchQuery,
  t,
  helperText,
  ...props
}) => {
  const observer = useRef();

  const lastOptionElementRef = useCallback(
    async (node) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          try {
            await onFetchMore(searchQuery);
          } catch (error) {
            console.error(error);
          }
        }
      });
      if (node) observer.current.observe(node);
    },
    [onFetchMore]
  );

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field: { onChange, value, ref }, fieldState: { error } }) => {
        let helpertext;
        if (t) {
          helpertext = error ? t(error.message) : t(helperText);
        } else {
          helpertext = error ? error.message : helperText;
        }

        return (
          <Autocomplete
            options={options}
            loading={loading}
            onChange={(e, newValue) => {
              if (onControlChgOvr) {
                onControlChgOvr(newValue);
              }
              onChange(newValue);
            }}
            onInputChange={onChangeovr}
            value={value}
            error={error}
            fullWidth
            getOptionLabel={(option) => {
              if (option !== null) return option.label;
              return '';
            }}
            isOptionEqualToValue={(option, value) => {
              return true;
            }}
            renderOption={(props, option, { index }) => {
              return (
                <OptionComponent
                  {...props}
                  isLastItem={index === options.length - 1}
                  showLoadingBelow={loading}
                  option={option}
                  hasMore={hasMore}
                  ref={index === options.length - 1 ? lastOptionElementRef : null}
                />
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                error={!!error}
                inputRef={ref}
                onChange={onChangeovr}
                onBlur={onBlurovr}
                onFocus={onChangeovr}
                helperText={helpertext}
              />
            )}
            {...props}
          />
        );
      }}
    />
  );
};
