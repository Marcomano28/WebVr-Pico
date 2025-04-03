/// <reference types="react" />
/// <reference types="react-dom" />

import 'react'

declare module 'react' {
  interface ReactNode {
    children?: ReactNode | undefined
  }

  interface FC<P = Record<string, unknown>> {
    (props: P): ReactElement | null
    displayName?: string
  }

  interface ReactElement<P = unknown, T extends string | JSXElementConstructor<unknown> = string | JSXElementConstructor<unknown>> {
    type: T
    props: P
    key: Key | null
  }

  type Key = string | number

  interface JSXElementConstructor<P> {
    (props: P): ReactElement<P, unknown> | null
  }

  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Extends React's HTMLAttributes
    className?: string;
  }
}

declare module 'next/dynamic' {
  import React from 'react';
  
  export default function dynamic<P = {}>(
    dynamicOptions: {
      loader: () => Promise<React.ComponentType<P>>;
      loading?: React.ComponentType<any>;
      ssr?: boolean;
      suspense?: boolean;
    } | (() => Promise<React.ComponentType<P>>),
    options?: {
      loading?: React.ComponentType<any>;
      ssr?: boolean;
      suspense?: boolean;
    }
  ): React.ComponentType<P>;
} 