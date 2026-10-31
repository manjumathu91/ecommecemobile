import React, { useState } from 'react';
import { KeyboardTypeOptions, View } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { HelperText, TextInput } from 'react-native-paper';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  multiline?: boolean;
  serverError?: string;
}

/** react-hook-form field with Paper's outlined input, inline validation message and a password visibility toggle. */
export default function FormInput<T extends FieldValues>({ control, name, label, secure, keyboardType, autoCapitalize = 'none', multiline, serverError }: Props<T>) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const message = error?.message ?? serverError;
        return (
          <View style={{ marginBottom: 4 }}>
            <TextInput
              mode="outlined"
              label={label}
              value={(value as string) ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={hidden}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              multiline={multiline}
              error={!!message}
              right={secure ? <TextInput.Icon icon={hidden ? 'eye-off' : 'eye'} onPress={() => setHidden((h) => !h)} /> : undefined}
            />
            <HelperText type="error" visible={!!message}>
              {message}
            </HelperText>
          </View>
        );
      }}
    />
  );
}
