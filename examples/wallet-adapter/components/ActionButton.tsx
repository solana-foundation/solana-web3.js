import type {ComponentPropsWithoutRef} from 'react';

interface ActionButtonProps extends ComponentPropsWithoutRef<'button'> {
  unsupported?: boolean;
}

export function ActionButton({
  children,
  disabled,
  unsupported = false,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || unsupported}
      className="wallet-adapter-button action"
    >
      {children}
      {unsupported && ' (not supported)'}
    </button>
  );
}
