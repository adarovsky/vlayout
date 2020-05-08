import React, { Component } from 'react';
import * as _ from 'lodash';
import { concat, Observable, of, Subscription, timer } from 'rxjs';
import { ReactView, ReactViewProps, ReactViewState } from '@adarovsky/vlayout';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { catchError, ignoreElements, map } from 'rxjs/operators';
import { TextPreview } from './text_preview';

interface DropZoneProps {
    alt?:               string;
    accept?:            string;
    darkMode?:          boolean;
    title:              string;
    thumbnailURL:       Observable<string>;
    uploadHandler:      (file: string | Blob) => Observable<number>;
}

interface DropZoneState {
    thumbnailURL:       string;
    uploading: boolean;
    uploadProgress: number;
    uploadError: string;
}

export class DropZone extends Component<DropZoneProps, DropZoneState> {

    static defaultProps = {
        alt: 'upload',
        accept: 'image/png,image/jpeg',
        darkMode: false
    };

    readonly inputRef = React.createRef<HTMLInputElement>();
    readonly dropRef = React.createRef<HTMLDivElement>();
    readonly subscription = new Subscription();

    constructor(props: Readonly<DropZoneProps>) {
        super(props);
        this.state = {thumbnailURL: '', uploading: false, uploadProgress: 0, uploadError: ''};
    }


    componentDidMount(): void {
        this.subscription.add(this.props.thumbnailURL.subscribe(url => this.setState({thumbnailURL: url})));
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    startUpload(): void {
        if (this.inputRef.current) {
            this.inputRef.current.click();
        }
    }

    onDragEnter() {
        if (this.dropRef.current) {
            this.dropRef.current.classList.add('highlighted');
        }
    }
    onDragLeave() {
        if (this.dropRef.current) {
            this.dropRef.current.classList.remove('highlighted');
        }
    }

    onDragOver(event: any) {
        event.preventDefault();
    }

    private upload(file: string | Blob) {
        this.onDragLeave();
        if (this.state.uploading)
            return;
        this.subscription.add(this.props.uploadHandler(file).pipe(
            map(p => ({uploading: true, uploadProgress: p})),
            catchError( e => {
                console.error('failed to upload:', e);
                return concat(
                of({uploading: false, uploadError: (e instanceof Error || e.hasOwnProperty('message')) ? e.message : "Upload failed"}),
                timer(2000).pipe(ignoreElements())
            )})
        ).subscribe({
            next: p => this.setState(p as DropZoneState),
            complete: () => this.setState({uploading: false, uploadError: ''})
        }));
    }

    onAssetDrop(event: any) {
        event.preventDefault(); // Prevent file from being opened
        let file = null;
        if (event.dataTransfer.items && event.dataTransfer.items.length === 1) {
            file = event.dataTransfer.items[0].getAsFile();
        } else if (event.dataTransfer.files && event.dataTransfer.files.length === 1) {
            file = event.dataTransfer.files[0];
        }

        if (file && _.includes(this.props.accept!.split(','), file.type)) {
            this.upload(file);
        }
    }

    finishUpload(event: React.ChangeEvent<HTMLInputElement>) {
        this.upload(event.target.files![0]);
    }

    render() {
        let content: any;
        if (this.state.uploading) {
            content = (<div className='cmpma_upload_border'>
                <div className='cmpma_upload_progress'>
                    <ProgressBar now={this.state.uploadProgress} label={`${Math.round(this.state.uploadProgress)}%`}/>
                </div>
            </div>);
        }
        else if (this.state.thumbnailURL && this.props.accept === 'text/plain') {
            content = (<>
                <div className={`cmpma_upload_noborder`}
                     ref={this.dropRef}
                     onDragEnter={() => this.onDragEnter()}
                     onDragLeave={() => this.onDragLeave()}
                     onDrop={e => this.onAssetDrop(e)}
                     onDragOver={e => this.onDragOver(e)}>
                    <TextPreview url={this.state.thumbnailURL}/>
                </div>
                <input className='cmpma_invisible_edit' type='file' accept={this.props.accept}
                       onChange={e => this.finishUpload(e)} ref={this.inputRef}/>
                <img src={this.props.darkMode ? 'res/assets/upload-white.png' : 'res/assets/upload.png'} alt={this.props.alt} className='cmpma_upload_img'
                     onClick={e => this.startUpload()}/>
            </>);
        }
        else if (this.state.thumbnailURL) {
            content = (<>
                <div className={`cmpma_upload_noborder`}
                     ref={this.dropRef}
                     onDragEnter={() => this.onDragEnter()}
                     onDragLeave={() => this.onDragLeave()}
                     onDrop={e => this.onAssetDrop(e)}
                     onDragOver={e => this.onDragOver(e)}>
                    <img src={this.state.thumbnailURL} alt={this.props.alt}
                         className='cmpma_logo'/>
                </div>
                <input className='cmpma_invisible_edit' type='file' accept={this.props.accept}
                       onChange={e => this.finishUpload(e)} ref={this.inputRef}/>
                <img src={this.props.darkMode ? 'res/assets/upload-white.png' : 'res/assets/upload.png'} alt={this.props.alt} className='cmpma_upload_img'
                     onClick={e => this.startUpload()}/>
            </>);
        }
        else {
            let text;
            if (this.state.uploadError) {
                text = (<div className='cmpma_upload_error'>
                    {this.state.uploadError}
                </div>);
            }
            else {
                text = (<div className='cmpma_upload_text'>
                    {this.props.title}
                </div>);
            }
            content = (<>
                <div className={`cmpma_upload_border`}
                     ref={this.dropRef}
                     onDragEnter={e => this.onDragEnter()}
                     onDragLeave={e => this.onDragLeave()}
                     onDrop={e => this.onAssetDrop(e)}
                     onDragOver={e => this.onDragOver(e)}>
                    {text}
                </div>
                <input className='cmpma_invisible_edit' type='file' accept={this.props.accept}
                       onChange={e => this.finishUpload(e)} ref={this.inputRef}/>
                <img src={this.props.darkMode ? 'res/assets/upload-white.png' : 'res/assets/upload.png'} alt={this.props.alt} className='cmpma_upload_img'
                     onClick={e => this.startUpload()}/>
            </>);
        }

        return (<div className='cmpma_drop_zone'>
            {content}
        </div>);
    }
}

export class LayoutDropZone extends ReactView<DropZoneProps & ReactViewProps, ReactViewState> {
    render() {
        return (<div style={this.style()}>
            <DropZone {...this.props} />
        </div>);
    }
}
