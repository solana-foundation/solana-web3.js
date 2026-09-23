import type { ComponentPropsWithoutRef, ReactElement } from 'react';

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
    endIcon?: ReactElement;
    startIcon?: ReactElement;
};

export function Button({ children, className = '', endIcon, startIcon, ...props }: ButtonProps) {
    return (
        <button type="button" {...props} className={`wallet-adapter-button ${className}`}>
            {startIcon && <i className="wallet-adapter-button-start-icon">{startIcon}</i>}
            {children}
            {endIcon && <i className="wallet-adapter-button-end-icon">{endIcon}</i>}
        </button>
    );
}
