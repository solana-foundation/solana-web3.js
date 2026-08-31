import type { CSSProperties, FC, MouseEvent, PropsWithChildren, ReactElement } from 'react';

export type ButtonProps = PropsWithChildren<{
    className?: string;
    disabled?: boolean;
    endIcon?: ReactElement;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    startIcon?: ReactElement;
    style?: CSSProperties;
    tabIndex?: number;
    'aria-expanded'?: boolean;
}>;

export const Button: FC<ButtonProps> = props => {
    return (
        <button
            aria-expanded={props['aria-expanded']}
            className={`wallet-adapter-button ${props.className || ''}`}
            disabled={props.disabled}
            style={props.style}
            onClick={props.onClick}
            tabIndex={props.tabIndex || 0}
            type="button"
        >
            {props.startIcon && <i className="wallet-adapter-button-start-icon">{props.startIcon}</i>}
            {props.children}
            {props.endIcon && <i className="wallet-adapter-button-end-icon">{props.endIcon}</i>}
        </button>
    );
};
