import React from 'react';
import { EMPTY, from, Observable, of, Subject, Subscription } from 'rxjs';
import { ReactView, ReactViewProps, ReactViewState } from '../';
import { flatMap, switchMap, tap } from 'rxjs/operators';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';
import PopoverTitle from 'react-bootstrap/PopoverTitle';
import Button from 'react-bootstrap/Button';
import PopoverContent from 'react-bootstrap/PopoverContent';

export interface TextUploadZoneProps {
    thumbnailURL:       Observable<string>;
    darkMode?:          boolean;
    uploadHandler:      (text: File) => Observable<number>;
}

interface TextUploadZoneState {
    thumbnailURL: string;
    content: string;
    uploadError: string;
    reviewing: boolean;
    uploading: boolean;
}

export class TextUploadZone extends React.Component<TextUploadZoneProps, TextUploadZoneState> {
    ref = React.createRef<HTMLDivElement>();
    reviewResult = new Subject<boolean>();
    private subscription = new Subscription();

    constructor(props: TextUploadZoneProps & ReactViewProps) {
        super(props);
        this.state = {...this.state,
            reviewing: false,
            uploading: false,
            content: '',
            uploadError: '',
            thumbnailURL: ''
        };
    }

    componentDidMount(): void {
        this.subscription.add(this.props.thumbnailURL.subscribe(thumbnailURL => this.setState({thumbnailURL})));
        this.subscription.add(this.props.thumbnailURL.pipe(
            switchMap(url => url ? from(fetch(url).then(res => res.ok ? res.text() : '')) : of(''))
        ).subscribe(c => {
            if (!this.state.reviewing) {
                this.setState({content: c})
            }
        }));
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    private createBlob() {
        return new File([this.state.content], 'file.txt', {type: 'text/plain'});
    }

    private upload() {
        this.reviewResult = new Subject<boolean>();
        this.setState({reviewing: true});
        this.subscription.add(this.reviewResult.pipe(
            tap(() => this.setState({uploading: true, uploadError: ''})),
            flatMap(ok => ok ? this.props.uploadHandler(this.createBlob()) : EMPTY)
        ).subscribe({
            error: e => this.setState({
                uploadError: (e instanceof Error || e.hasOwnProperty('message')) ? e.message : "Upload failed",
                uploading: false
            }),
            complete: () => this.setState({uploadError: '', uploading: false})
        }));
    }

    private review(result: boolean) {
        this.setState({reviewing: false});
        this.reviewResult.next(result);
        this.reviewResult.complete();
    }

    private get progress() {
        return (<div style={{
            position: 'absolute',
            width: '35px',
            height: '35px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
        }}><svg className="vlayout_spinner" viewBox="0 0 50 50">
                <circle className="path" cx="50%" cy="50%" r="40%" fill="none" strokeWidth="2" stroke={this.props.darkMode ? '#ffffff' : '#3f3f3f'}/>
            </svg>
        </div>);
    }

    render() {
        let content;
        if (this.state.uploading) {
            content = (<div className='cmpma_upload_border'>
                {this.progress}
            </div>);
        }
        else if(this.state.thumbnailURL && this.props.darkMode) {
            content = (<div className={`cmpma_upload_border`}
                            onClick={() => this.upload()}>
            </div>);
        }
        else if(this.state.thumbnailURL) {
            content = (<div className={`cmpma_upload_border`}>
            </div>);
        }
        else {
            content = (<div className={`cmpma_upload_border`}
                     onClick={() => this.upload()}>
                {this.state.uploadError ? <div className='cmpma_upload_error'>
                    {this.state.uploadError}
                </div> : <div className='cmpma_upload_text'>
                    Tap to set text
                </div>}
            </div>);
        }

        return (<div className='text_upload' ref={this.ref}>
            {content}
            {this.state.thumbnailURL && !this.props.darkMode && <div className={'upload_button vlayout_button'}
                                             onClick={() => this.upload()}
                                        >Update text</div>}
            <Overlay show={this.state.reviewing} target={this.ref.current!} placement="top">
                <Popover id={'text_preview'}>
                    <PopoverTitle>
                        <Button variant='secondary'
                                size='sm'
                                onClick={() => this.review(false)}>Cancel</Button>
                        Text Review
                        <Button variant='primary'
                                size='sm'
                                disabled={!this.state.content}
                                onClick={() => this.review(true)}>Accept</Button>
                    </PopoverTitle>
                    <PopoverContent>
                        <textarea
                            autoFocus={true}
                            className='text_preview'
                            placeholder='Enter or paste text here'
                            rows={15}
                            cols={40}
                            value={this.state.content}
                            onChange={event => this.setState({content: event.target.value ?? ''})}
                        />
                        </PopoverContent>
                </Popover>
            </Overlay>
        </div>);
    }
}

export class LayoutTextUploadZone extends ReactView<TextUploadZoneProps & ReactViewProps, ReactViewState> {
    render() {
        return (<div className='layout_text_upload_zone' style={this.style()}>
            <TextUploadZone {...this.props} />
        </div>);
    }
}
