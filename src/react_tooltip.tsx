import React, { useEffect, useState } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import 'tippy.js/themes/light-border.css';
import 'tippy.js/themes/material.css';
import 'tippy.js/themes/translucent.css';

import { ReactAbsoluteLayout } from './react_absolute';
import { View } from './view';
import { Tooltip } from './tooltip';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Placement } from 'tippy.js';

export class ReactTooltip extends ReactAbsoluteLayout<any> {}

export function TooltipComponent(props: { tooltip: Tooltip; content: View }) {
    const [mounted, setMounted] = useState(false);
    const [mountedObservable] = useState(() => new BehaviorSubject(false));
    const [theme, setTheme] = useState('light-border');
    const [placement, setPlacement] = useState('top' as Placement);

    useEffect(() => {
        const subscription = new Subscription();

        subscription.add(mountedObservable.subscribe(setMounted));

        const theme = props.tooltip.property('theme').value?.sink;
        if (theme) {
            subscription.add(theme.subscribe(setTheme));
        }

        const placement = props.tooltip.property('placement').value?.sink;
        if (placement) {
            subscription.add(placement.subscribe(setPlacement));
        }

        return () => subscription.unsubscribe();
    }, [props.tooltip]);

    return (
        <Tippy
            onMount={() => {
                mountedObservable.next(true);
            }}
            onHidden={() => {
                mountedObservable.next(false);
            }}
            theme={theme}
            placement={placement}
            // hideOnClick={false}
            // trigger={'click'}
            content={mounted ? props.tooltip.getTargetWithRef(null) : ''}
        >
            <InnerContent view={props.content} />
        </Tippy>
    );
}

const InnerContent = React.forwardRef<HTMLDivElement, { view: View | null }>(
    (props, ref) => props.view?.getTargetWithRef(ref) ?? null
);
