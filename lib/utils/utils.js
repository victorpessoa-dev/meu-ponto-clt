/**
 * Utilitarios compartilhados de composicao visual.
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes condicionais e resolve conflitos de Tailwind.
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
