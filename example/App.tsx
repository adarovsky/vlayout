import * as React from 'react';
import { Component, createElement } from 'react';
import './App.css';
import { Color, Engine, Layout } from '../';
import { BehaviorSubject, concat, interval, Observable, of, throwError, timer } from 'rxjs';
import { finalize, ignoreElements, map, pluck, scan, shareReplay, startWith, take, takeWhile } from 'rxjs/operators';
import { SampleView } from './sample_view';
import { LayoutURLEntry } from './url_entry';
import { LayoutDropZone } from './drop_zone';
import 'bootstrap/dist/css/bootstrap.min.css';
import { v1 as uuid_v1 } from 'uuid';
import { ParticipantMessage } from './participant_message';
import { LayoutWowField } from './wow_field';
import { LayoutTextUploadZone } from './text_upload_zone';
import { readFileSync } from 'fs';

const layout = readFileSync(__dirname + '/main.vlayout', 'utf8');

export enum InteractionStatus {
    Suspended,
    Resumed,
    Applicant,
    Enqueued,
    Invited,
    PreScreen,
    OnHold,
    OnAir
}

export enum JoinStatus {
    Added,
    Joined,
    Left,
    Disconnected
}


export enum FrameStatus {
    Minimized = 1,
    Maximized = 2
}

export enum SessionPhase {
    Empty,//no session information, with this phase we may either join existing session or create new one
    Connecting,//got session information, but not yet joined or disconnected
    WaitingForActivation,//joined to a session, but session is not yet activated
    Activated,//joined to an active session
    Closed,//session closed on runner, no connection to session
    Full
}

interface Fan {
    isGuest: boolean;
    borderColor: Color;
    role: string;
    listIndex: number;
    frameStatus: FrameStatus;
    audioOnly: boolean;
    airIndex: number;
    name: string;
    id: string;
    joinStatus: JoinStatus;
    poorConnection: boolean;
    muted: boolean;
    interactionStatus: InteractionStatus
}

interface AppState {
    content1: string | null;
    content2: string | null;
    error: Error | null;
    isLoaded: boolean;
    layoutNo: number;
    fans: Fan[]
}

enum AppFsmStates {
    Failed = 'Failed',
    Greeting = 'Greeting',
    Login = 'Login',
    Prepare = 'Prepare',
    SessionControl = 'SessionControl',
    SessionEdit = 'SessionEdit',
    Started = 'Start',
}

class App extends Component {
    private readonly engine: Engine;
    private isTownhall: Observable<boolean>;

    counter = of (1);

    state: AppState = {
        error: null,
        isLoaded: false,
        content1: null,
        content2: null,
        layoutNo: 1,
        fans: [
            {
                airIndex: 0,
                frameStatus: FrameStatus.Minimized,
                id: 'fan1',
                interactionStatus: InteractionStatus.Suspended,
                joinStatus: JoinStatus.Joined,
                listIndex: 0,
                muted: false,
                name: 'Fan 1',
                role: 'fan',
                borderColor: Color.fromHex('#ccddcc'),
                poorConnection: false,
                audioOnly: false,
                isGuest: true,
            },
            {
                airIndex: 1,
                frameStatus: FrameStatus.Minimized,
                id: 'fan2',
                interactionStatus: InteractionStatus.Suspended,
                joinStatus: JoinStatus.Joined,
                listIndex: 1,
                muted: false,
                name: 'Fan 2',
                role: 'fan',
                borderColor: Color.fromHex('#ccddcc'),
                poorConnection: false,
                audioOnly: true,
                isGuest: true,
            },
            {
                airIndex: 0,
                frameStatus: FrameStatus.Minimized,
                id: 'fan3',
                interactionStatus: InteractionStatus.Suspended,
                joinStatus: JoinStatus.Joined,
                listIndex: 2,
                muted: false,
                name: 'Fan 3',
                role: 'fan',
                borderColor: Color.fromHex('#ccddcc'),
                poorConnection: false,
                audioOnly: false,
                isGuest: true,
            },
            {
                airIndex: 0,
                frameStatus: FrameStatus.Minimized,
                id: 'fan4',
                interactionStatus: InteractionStatus.Suspended,
                joinStatus: JoinStatus.Joined,
                listIndex: 3,
                muted: false,
                name: 'Fan 4',
                role: 'fan',
                borderColor: Color.fromHex('#ccddcc'),
                poorConnection: false,
                audioOnly: false,
                isGuest: false,
            }

        ]
    };


    constructor(props: any) {
        super(props);

        const ifbAll = new BehaviorSubject(false);

        this.engine = new Engine();
        this.engine.registerInput("test", this.engine.numberType(), interval(1000).pipe(
            startWith(0),
            scan((acc, one) => {
                const [cur, delta] = acc;
                let d = delta;
                if (cur + d > 4 || cur + d < 0) {
                    d = -d;
                }
                return [cur + d, d];
            }, [1, -1]),
            pluck(0)
        ));
        // this.engine.inputs.registerInput("test", this.engine.numberType(), of(3));
        this.engine.registerView('sessionTitleEditor', x => <SampleView parentView={x} key={'text_entry'} color={"#054411"}/>);
        this.engine.registerView('introScreenSponsorship', x => <SampleView parentView={x} key={'123'} color={"#ccaa00"}/>);
        this.engine.registerView('introScreenShare', x => <SampleView parentView={x} key={'1231'} color={"#ccaa00"}/>);
        this.engine.registerView('introScreenGuests', x => <SampleView parentView={x} key={'1232'} color={"#ccaa00"}/>);
        this.engine.registerView('introScreenCisco', x => <SampleView parentView={x} key={'1233'} color={"#65cc26"}/>);
        this.engine.registerButton('activateSessionButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('quitSessionButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('retryConnectButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('activateSessionButton2', async () => {
            introScreen.next(3);
        });
        this.engine.registerButton('quitSessionButton2', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('openFloorButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('closeFloorButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });


        this.engine.registerEnum('AppState', {
            'greeting': AppFsmStates.Greeting,
            'login': AppFsmStates.Login,
            'prepare': AppFsmStates.Prepare,
            'sessionControl': AppFsmStates.SessionControl,
            'sessionEdit': AppFsmStates.SessionEdit,
            'started': AppFsmStates.Started
        });
        this.engine.registerEnum('JoinStatus', {
            'added': JoinStatus.Added,
            'joined': JoinStatus.Joined,
            'left': JoinStatus.Left,
            'disconnected': JoinStatus.Disconnected
        });
        this.engine.registerEnum('SessionPhase', {
            'empty': SessionPhase.Empty,
            'connecting': SessionPhase.Connecting,
            'waitingForActivation': SessionPhase.WaitingForActivation,
            'activated': SessionPhase.Activated,
            'closed': SessionPhase.Closed,
            'full': SessionPhase.Full
        });
        this.engine.registerEnum('InteractionStatus', {
            'suspended': InteractionStatus.Suspended,
            'resumed': InteractionStatus.Resumed,
            'applicant': InteractionStatus.Applicant,
            'enqueued': InteractionStatus.Enqueued,
            'invited': InteractionStatus.Invited,
            'preScreen': InteractionStatus.PreScreen,
            'onHold': InteractionStatus.OnHold,
            'onAir': InteractionStatus.OnAir
        });
        this.engine.registerEnum('FrameStatus', {
            'minimized': FrameStatus.Minimized,
            'maximized': FrameStatus.Maximized
        });

        this.engine.registerEnum('MediaSource', {
            self: 'self',
            external: 'external'
        });

        const participantType = {
            airIndex: this.engine.numberType(),
            frameStatus: this.engine.type('FrameStatus')!,
            id: this.engine.stringType(),
            interactionStatus: this.engine.type('InteractionStatus')!,
            joinStatus: this.engine.type('JoinStatus')!,
            headline: this.engine.stringType(),
            location: this.engine.stringType(),
            alreadyPrescreened: this.engine.boolType(),
            listIndex: this.engine.numberType(),
            userIndex: this.engine.numberType(),
            muted: this.engine.boolType(),
            ifb: this.engine.boolType(),
            name: this.engine.stringType(),
            role: this.engine.stringType(),
            poorConnection: this.engine.boolType(),
            audioOnly: this.engine.boolType(),
            isGuest: this.engine.boolType()
        };
        this.engine.registerList('Participants', {
            participant: participantType,
            new: {
            }
        });

        this.engine.registerList('Guests', {
            online: participantType,
            invited: {
                name: this.engine.stringType(),
                userId: this.engine.stringType(),
                contact: this.engine.stringType(),
                contact_type: this.engine.stringType(),
                userIndex: this.engine.numberType()
            },
            new: {
            }
        });

        this.engine.registerList('StoredGuests', {
            stored: {
                name: this.engine.stringType(),
                contact: this.engine.stringType(),
                invited: this.engine.boolType()
            },
            last: {}
        });

        this.engine.registerList('OnAir', {
            participant: participantType
        });

        const participantTemplate = {
            airIndex: 0,
            frameStatus: FrameStatus.Minimized,
            interactionStatus: InteractionStatus.PreScreen,
            joinStatus: JoinStatus.Joined,
            listIndex: 0,
            userIndex: -1,
            muted: false,
            role: 'fan',
            poorConnection: false,
            audioOnly: false,
            ifb: false
        };

        const users = [{
            participant: {
                ...participantTemplate,
                id: 'user1',
                headline: 'hi there',
                alreadyPrescreened: true,
                name: 'User 1',
                userId: uuid_v1(),
                location: 'Courusant, Empire',
                interactionStatus: InteractionStatus.PreScreen
            }
        },{
            participant:
                {
                    ...participantTemplate,
                    id: 'user2',
                    userId: uuid_v1(),
                    headline: 'wanna talk',
                    alreadyPrescreened: false,
                    name: 'User 2',
                    location: 'Tatouine, middle of Nowhere',
                    poorConnection: true
                }
        },{
            participant:
                {
                    ...participantTemplate,
                    id: 'user3',
                    userId: uuid_v1(),
                    headline: 'cannot stop communicating',
                    alreadyPrescreened: false,
                    name: 'User 3',
                    location: 'Mustafar, Empire'
                }
        },{
            participant:
                {
                    ...participantTemplate,
                    id: 'user4',
                    alreadyPrescreened: true,
                    name: 'User 4',
                    location: 'Mustafar, Empire',
                }
        }];

        const invited = [
            {
                online:
                    {
                        ...participantTemplate,
                        id: 'user5',
                        headline: 'cannot stop communicating',
                        alreadyPrescreened: true,
                        name: 'User 5',
                        location: 'Mustafar, Empire',
                        userIndex: 0,
                        muted: false,
                        ifb: true,
                        userId: uuid_v1(),
                        interactionStatus: InteractionStatus.Applicant
                    }
            },{
                online:
                    {
                        ...participantTemplate,
                        id: 'user6',
                        headline: 'cannot stop communicating',
                        alreadyPrescreened: true,
                        name: 'User 6',
                        location: 'Mustafar, Empire',
                        userIndex: 1,
                        muted: true,
                        userId: uuid_v1(),
                        interactionStatus: InteractionStatus.OnAir
                    }
            },
            {
                invited: {
                    id: 'invited1',
                    userId: uuid_v1(),
                    name: 'Invited user 1',
                    contact: 'mail1@domain.com',
                    contact_type: 'mail'
                }
            },
            {
                invited: {
                    id: 'invited2',
                    userId: uuid_v1(),
                    name: 'Invited user 2',
                    contact: 'sip:username2@very.very.very.vert.long.sip.domain.com',
                    contact_type: 'sip'
                }
            },
            {
                invited: {
                    id: 'invited3',
                    userId: uuid_v1(),
                    name: 'Invited user 3',
                    contact: 'username3@mail.domain.com',
                    contact_type: 'rtmp'
                }
            }
        ].concat([{new : { id: 'new_guest' }}] as any[]);


        const storedGuests = [{
            stored: {
                id: 'stored1',
                name: 'Invited user 1',
                contact: 'smail1@domain.com',
                invited: false
            }
        }, {
            stored: {
                id: 'stored2',
                name: 'Invited user 2',
                contact: 'smail2@domain.com',
                invited: false
            }
        }, {
            stored: {
                id: 'stored3',
                name: 'Invited user 3',
                contact: 'sip:username@very.very.very.vert.long.sip.domain.com',
                invited: true
            }
        }, {
            last: {
                id: 'last'
            }
        }];


        this.engine.registerInput('session.guests', this.engine.type('Guests')!, of(invited));
        this.engine.registerListButton('inviteResendButton', async item => {});
        this.engine.registerListButton('inviteCancelButton', async item => {});
        // this.engine.registerListTextField('sipAddressField', item => {});
        // this.engine.registerListTextField('rtmpAddressField', item => {});

        this.engine.registerListButton('guestMuteButton', async item => {});
        this.engine.registerListButton('guestUnmuteButton', async item => {});
        this.engine.registerListButton('guestIFBButton', async item => item.ifb.next(true));
        this.engine.registerListButton('guestUnIFBButton', async item => item.ifb.next(false));
        this.engine.registerListButton('guestToggleButton', async item => {});
        this.engine.registerListView('guestInviteNew', parent => <SampleView color={'#145725'} parentView={parent} key={'add_new'} />);

        this.engine.registerInput('session.storedGuests', this.engine.type('StoredGuests')!, of(storedGuests));

        this.engine.registerInput('session.participants', this.engine.type('Participants')!, of(users));
        this.engine.registerListView('participantPreview', (parent, item) => <SampleView color={'#4a9bbc'} parentView={parent} key={'participant_preview'} />);
        this.engine.registerListView('participantMessage', (parent, item) => <ParticipantMessage sendMessage={m => console.log('sending', m)} parentView={parent} />);
        this.engine.registerListButton('prescreenSelect', async item => {});
        this.engine.registerListButton('prescreenDisconnect', async item => {});
        this.engine.registerListButton('prescreenDialog', async item => {});
        this.engine.registerListButton('prescreenHold', async item => {});
        this.engine.registerListButton('prescreenTap', async item => {});

        const participantsOnAir = interval(2000).pipe(
            map(x => this.state.fans.slice(0, x)),
            map( fans => fans.filter(f => f.interactionStatus === InteractionStatus.OnAir)),
            takeWhile(x => x.length <= 2),
            shareReplay({bufferSize: 1, refCount: true})
        );

        this.engine.registerInput('participantsOnAir', this.engine.type('OnAir')!, participantsOnAir.pipe(
            map(fans => fans.map(p => ({participant: p}))),
        ));
        this.engine.registerInput('maximizedCount', this.engine.numberType(), participantsOnAir.pipe(
            map( fans => fans.reduce((previousValue, currentValue) =>
                previousValue + (currentValue.frameStatus === FrameStatus.Maximized ? 1 : 0), 0))
        ));

        this.engine.registerListView('fanPlayer', (parent, item) =>
            <SampleView parentView={parent} key='fanPlayer' color={'#4cc7cc'} />);

        this.engine.registerListButton(`participantMinimizeButton`, async item => {
        });

        this.engine.registerListButton(`participantDisconnectButton`, async item => {
        });

        this.engine.registerListButton(`participantBlockButton`, async (item) => {
        });

        this.engine.registerButton(`firstFanDisconnectButton`, async () => {
        });

        this.engine.registerButton(`firstFanBlockButton`, async () => {
        });
        this.engine.registerInput("numberOfFansOnAir", this.engine.numberType(), participantsOnAir.pipe(
            map( fans => fans.reduce((previousValue, currentValue) =>
                previousValue + (currentValue.isGuest ? 0 : 1), 0))
        ));
        this.engine.registerInput('canSelectNext', this.engine.boolType(), of(false));

        this.engine.registerInput("session.subject", this.engine.stringType(), of("subject"));
        this.engine.registerInput("session.phase", this.engine.type("SessionPhase")!, of(SessionPhase.WaitingForActivation));
        this.engine.registerInput("session.floor.opened", this.engine.boolType(), of(true));
        this.engine.registerInput('session.floor.public', this.engine.boolType(), of(true));
        this.engine.registerInput("session.userCount", this.engine.numberType(), of(1));
        this.engine.registerInput("session.participantCount", this.engine.numberType(), of(10));
        this.engine.registerInput("session.onHoldCount", this.engine.numberType(), of(10));
        this.engine.registerInput("session.ifbAll", this.engine.boolType(), ifbAll);
        this.engine.registerInput("closeConfirmationVisible", this.engine.boolType(), of(true));
        this.engine.registerInput("controlsVisible", this.engine.boolType(), of(true));
        this.engine.registerInput("authorized", this.engine.boolType(), interval(1000).pipe(
            map(x => x % 2 === 1)
        ));
        this.engine.registerInput('appState', this.engine.type('AppState')!, of(AppFsmStates.SessionControl));
        const introScreen = new BehaviorSubject(3);
        this.engine.registerInput("introScreen", this.engine.numberType(), introScreen);

        const sharingCisco = new BehaviorSubject(true);
        this.engine.registerInput('sharingCisco', this.engine.boolType(), sharingCisco);
        this.engine.registerButton('endSharingCisco', async () => {
            sharingCisco.next(false);
        });


        this.isTownhall = of(true);
        this.engine.registerInput("showGeofence", this.engine.boolType(), of(false));
        this.engine.registerInput("isLocationGlobal", this.engine.boolType(), of(true));
        this.engine.registerInput("isTownhall", this.engine.boolType(), this.isTownhall);
        this.engine.registerInput("locationTitle", this.engine.stringType(), of('Washington DC, US'));
        this.engine.registerInput("celebrity.id", this.engine.stringType(), of("celebrity"));
        this.engine.registerInput("celebrity.poorConnection", this.engine.boolType(), of(false));
        this.engine.registerInput("celebrity.name", this.engine.stringType(), of("celeb name"));
        this.engine.registerInput("celebrity.role", this.engine.stringType(), of("initiator"));
        this.engine.registerInput("celebrity.airIndex", this.engine.numberType(), of(0));
        this.engine.registerInput("celebrity.listIndex", this.engine.numberType(), of(0));
        this.engine.registerInput("celebrity.muted", this.engine.boolType(), of(false));
        this.engine.registerInput("celebrity.ifb", this.engine.boolType(), of(false));
        this.engine.registerInput("celebrity.joinStatus", this.engine.type('JoinStatus')!, of(JoinStatus.Joined));
        this.engine.registerInput("celebrity.frameStatus", this.engine.type('FrameStatus')!, of(FrameStatus.Minimized));
        this.engine.registerInput("celebrity.interactionStatus", this.engine.type('InteractionStatus')!, of(InteractionStatus.OnAir));
        this.engine.registerInput("authUserName", this.engine.stringType(), of("asd"));
        this.engine.registerInput("tintColor", this.engine.colorType(), of(new Color(255, 255, 255)));
        this.engine.registerInput("assets.backgroundUrl", this.engine.stringType(), of(''));
        this.engine.registerInput("assets.logoUrl", this.engine.stringType(), of(''));
        this.engine.registerInput("assets.bannerUrl", this.engine.stringType(), of(''));
        this.engine.registerInput("rtmpUrl", this.engine.stringType(), of('rtmp://vydeo.vyulabs.com/vydeo'));
        this.engine.registerView('celebrityPlayer', x => createElement(SampleView, {
            parentView: x,
            key: 'celebrity',
            color: '#115533'
        }));
        this.engine.registerView('celebrityAvatar', x => createElement(SampleView, {
            parentView: x,
            key: 'celebrity_avatar',
            color: '#115533'
        }));
        this.engine.registerView('prescreenPlayer', x => createElement(SampleView, {
            parentView: x,
            key: 'prescreen',
            color: '#1d6f8f'
        }));

        this.engine.registerInput("manager.id", this.engine.stringType(), of("celebrity"));
        this.engine.registerInput("manager.poorConnection", this.engine.boolType(), of(false));
        this.engine.registerInput("manager.name", this.engine.stringType(), of("manager name"));
        this.engine.registerInput("manager.role", this.engine.stringType(), of("manager"));
        this.engine.registerInput("manager.airIndex", this.engine.numberType(), of(0));
        this.engine.registerInput("manager.listIndex", this.engine.numberType(), of(0));
        this.engine.registerInput("manager.muted", this.engine.boolType(), of(false));
        this.engine.registerInput("manager.ifb", this.engine.boolType(), of(false));
        this.engine.registerInput("manager.joinStatus", this.engine.type('JoinStatus')!, of(JoinStatus.Joined));
        this.engine.registerInput("manager.frameStatus", this.engine.type('FrameStatus')!, of(FrameStatus.Minimized));
        this.engine.registerInput("manager.interactionStatus", this.engine.type('InteractionStatus')!, of(InteractionStatus.OnAir));

        this.engine.registerInput("prescreen.id", this.engine.stringType(), of(''));
        this.engine.registerInput("prescreen.poorConnection", this.engine.boolType(), of(false));
        this.engine.registerInput("prescreen.name", this.engine.stringType(), of("celeb name"));
        this.engine.registerInput("prescreen.role", this.engine.stringType(), of("fan"));
        this.engine.registerInput("prescreen.airIndex", this.engine.numberType(), of(0));
        this.engine.registerInput("prescreen.listIndex", this.engine.numberType(), of(0));
        this.engine.registerInput("prescreen.muted", this.engine.boolType(), of(false));
        this.engine.registerInput("prescreen.joinStatus", this.engine.type('JoinStatus')!, of(JoinStatus.Joined));
        this.engine.registerInput("prescreen.frameStatus", this.engine.type('FrameStatus')!, of(FrameStatus.Minimized));
        this.engine.registerInput("prescreen.interactionStatus", this.engine.type('InteractionStatus')!, of(InteractionStatus.PreScreen));

        this.engine.registerButton('authButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('activateSessionButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('startButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });

        this.engine.registerButton('continueButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });
        this.engine.registerButton('shareFacebook', async () => {});
        this.engine.registerButton('shareTwitter', async () => {});
        this.engine.registerButton('shareInstagram', async () => {});
        this.engine.registerButton('shareLinkedin', async () => {});

        this.engine.registerButton('ifbAllButton', async () => ifbAll.next(true));
        this.engine.registerButton('unifbAllButton', async () => ifbAll.next(false));

        this.engine.registerButton('hostMuteButton', async () => {});
        this.engine.registerButton('hostUnmuteButton', async () => ifbAll.next(false));
        this.engine.registerButton('hostIFBButton', async () => ifbAll.next(true));
        this.engine.registerButton('hostUnIFBButton', async () => ifbAll.next(false));

        this.engine.registerView('sponsorUrlView', x => createElement(LayoutURLEntry, {
            key: 'url_entry',
            content: of(''),
            urlChanged: content => console.log('url:', content),
            parentView: x
        }));
        this.engine.registerButton('geofenceButton', async () => {});
        this.engine.registerButton('geofenceInviteButton', async () => {});
        this.engine.registerButton('geofenceCancelButton', async () => {});

        const muted = new BehaviorSubject(false);
        this.engine.registerInput('session.muted', this.engine.boolType(), muted);
        this.engine.registerInput('session.isTownhall', this.engine.boolType(), of(true));
        this.engine.registerInput('session.playerUrls.public', this.engine.stringType(), of(''));
        this.engine.registerInput('session.playerUrls.broadcaster', this.engine.stringType(), of(''));
        this.engine.registerButton('muteAllButton', async () => muted.next(true));
        this.engine.registerButton('unmuteAllButton', async () => muted.next(false));

        this.engine.registerInput('media.source', this.engine.type('MediaSource')!, of('self'));
        this.engine.registerInput('media.echoCancellation', this.engine.boolType(), of(true));
        this.engine.registerInput('media.needSoundActivation', this.engine.boolType(), of(true));
        this.engine.registerButton('activateSoundButton', async () => {});

        const showPrior = new BehaviorSubject(false);
        this.engine.registerInput('guests.showingPriorPane', this.engine.boolType(), showPrior);
        this.engine.registerButton('priorGuestsButton', async () => showPrior.next(true));
        this.engine.registerButton('priorGuestsDoneButton', async () => showPrior.next(false));
        this.engine.registerButton('priorGuestsInviteButton', async () => showPrior.next(true));

        this.engine.registerView('backgroundUpload', x => createElement(LayoutDropZone, {
            key: 'background_upload',
            title: "1280x720",
            alt: 'background',
            thumbnailURL: of(''),
            uploadHandler: file => {
                console.log('uploading', file);
                return uploadImage(file, 'background');
            },
            parentView: x
        }));

        this.engine.registerView('logoUpload', x => createElement(LayoutDropZone, {
            key: 'logo_upload',
            title: "600x300",
            alt: 'logo',
            thumbnailURL: of(''),
            uploadHandler: file => {
                console.log('uploading', file);
                return concat(interval(100).pipe(take(50)),
                    throwError({message: "permission denied"})
                );
            },
            parentView: x
        }));
        this.engine.registerView('bannerUpload', x => createElement(LayoutDropZone, {
            key: 'logo_upload',
            title: "600x300",
            alt: 'logo',
            thumbnailURL: of(''),
            uploadHandler: file => {
                console.log('uploading', file);
                return concat(interval(100).pipe(take(50)),
                    throwError({message: "permission denied"})
                );
            },
            parentView: x
        }));

        const uploaded = new BehaviorSubject('');
        this.engine.registerView('textUpload', x => createElement(LayoutTextUploadZone, {
            key: 'text_upload',
            thumbnailURL: uploaded,
            uploadHandler: file => {
                console.log('uploading', file);
                return concat(interval(10).pipe(take(100), finalize(() => uploaded.next('https://raw.githubusercontent.com/popperjs/react-popper/master/README.md'))));
            },
            parentView: x
        }));
        this.engine.registerView('introTextUpload', x => createElement(LayoutTextUploadZone, {
            key: 'text_upload',
            thumbnailURL: uploaded,
            darkMode: true,
            uploadHandler: file => {
                console.log('uploading', file);
                return concat(interval(10).pipe(take(100), finalize(() => uploaded.next('https://raw.githubusercontent.com/popperjs/react-popper/master/README.md'))));
            },
            parentView: x
        }));
        this.engine.registerInput("assets.lyricsUrl", this.engine.stringType(), uploaded);

        this.engine.registerView('textPreview', x => <SampleView key={'text_preview'} color={'#cdf'} parentView={x}/>);

        const showLyrics = new BehaviorSubject(true);
        this.engine.registerInput("showLyrics", this.engine.boolType(), showLyrics);
        this.engine.registerButton('toggleLyricsButton', async () => showLyrics.next(!showLyrics.value));

        const streamingYoutube = new BehaviorSubject(false);
        this.engine.registerInput("streaming.youtube.ready", this.engine.boolType(), of(true));
        this.engine.registerInput("streaming.youtube.updating", this.engine.boolType(), of(false));
        this.engine.registerInput("streaming.youtube.on", this.engine.boolType(), streamingYoutube);

        this.engine.registerInput("streaming.periscope.ready", this.engine.boolType(), of(true));
        this.engine.registerInput("streaming.periscope.updating", this.engine.boolType(), of(false));
        this.engine.registerInput("streaming.periscope.on", this.engine.boolType(), streamingYoutube);

        this.engine.registerInput("streaming.facebook.ready", this.engine.boolType(), of(true));
        this.engine.registerInput("streaming.facebook.updating", this.engine.boolType(), of(false));
        this.engine.registerInput("streaming.facebook.on", this.engine.boolType(), streamingYoutube);


        this.engine.registerButton('toggleYoutubeButton', async () => streamingYoutube.next(!streamingYoutube.value));

        this.engine.registerView('mapView', x => <SampleView color='#dddddd' parentView={x} key={'map_view'}/>);

        this.engine.registerView('sharePanel', x => <SampleView color='#dddddd' parentView={x} key={'share_panel'}/>);

        this.engine.registerList('VODs', {
            loaded: {
                thumbnailUrl: this.engine.stringType(),
                ready: this.engine.boolType(),
                playing: this.engine.boolType(),
                paused: this.engine.boolType()
            },
            new: {
            }
        });
        this.engine.registerInput('vods.content', this.engine.type('VODs')!, of([
            {
                loaded: {
                    id: 1,
                    thumbnailUrl: "https://images2.minutemediacdn.com/image/upload/c_crop,h_1193,w_2121,x_0,y_64/f_auto,q_auto,w_1100/v1565279671/shape/mentalfloss/578211-gettyimages-542930526.jpg",
                    ready: true,
                    playing: false,
                    paused: false
                }
            },
            {
                loaded: {
                    id: 2,
                    thumbnailUrl: "",
                    ready: false,
                    playing: false,
                    paused: false
                }
            },
            {
                loaded: {
                    id: 3,
                    thumbnailUrl: "http://images2.minutemediacdn.com/image/upload/c_fit,f_auto,fl_lossy,q_auto,w_728/v1568131360/shape/mentalfloss/599713-gettyimages-1084775578.jpg?itok=VtCO0Pd6",
                    ready: true,
                    playing: false,
                    paused: false
                }
            },
            { 'new': {}}
        ]));

        this.engine.registerInput('vods.supported', this.engine.boolType(), concat(
            of(false),
            timer(2000).pipe(ignoreElements()),
            of(true)
        ));

        this.engine.registerListButton('playVodButton', async item => console.log(item));
        this.engine.registerListButton('deleteVodButton', async item => console.log(item));

        this.engine.registerButton('pauseVodButton', async () => {});
        this.engine.registerButton('resumeVodButton', async () => {});
        this.engine.registerButton('stopVodButton', async () => {});

        this.engine.registerListView('videoDropZone', (parent, item) => createElement(LayoutDropZone, {
            key: 'video_upload',
            title: "Under 2 Mbps\n16:9 or 4:3",
            alt: 'video',
            accept: 'video/quicktime,video/mp4',
            thumbnailURL: of(''),
            uploadHandler: file => {
                console.log('uploading', file);
                return interval(100).pipe(take(100));
            },
            parentView: parent
        }));

        this.engine.registerView('wowField', parent => <LayoutWowField shoot={interval(1000).pipe(
            startWith(1),
            map(x => x % 2 ? 'like' : 'wow')
        )} parentView={parent} key={parent.key} image={() => '/logo192.png'}/>);

        this.engine.registerListView('videoPreview', (parent, item) => <SampleView color={'#00ffcc'} parentView={parent} key={'video_preview'} />);

        this.engine.registerView('vodPlayer', parent => <SampleView color={'#00ffcc'} parentView={parent} key={'vod_player'} />);
        this.engine.registerInput('vods.playing', this.engine.boolType(), of(false));
        this.engine.registerInput('vods.paused', this.engine.boolType(), of(false));

        this.engine.registerButton('introButton1', async () => {
            introScreen.next(0);
        });
        this.engine.registerButton('introButtonGuests', async () => {
            const isTownhall = await this.isTownhall.pipe(take(1)).toPromise();
            introScreen.next(isTownhall ? 0 : 1);
        });
        this.engine.registerButton('introButtonShare', async () => {
            const isTownhall = await this.isTownhall.pipe(take(1)).toPromise();
            introScreen.next(isTownhall ? 1 : 2);
        });
        this.engine.registerButton('introButtonDone', async () => {
            introScreen.next(3);
        });

        this.engine.registerInput('showBulkInvite', this.engine.boolType(), of(true));
        const list = new BehaviorSubject('');
        this.engine.registerView('bulkInviteView', parent =>
            <SampleView key={'bulk_invite'} parentView={parent} color={'#ccc'}/>);
        this.engine.registerButton('bulkInviteButton', async () => {});
        this.engine.registerInput('bulkInviteValid', this.engine.boolType(), of(true));
        this.engine.registerButton('bulkInviteButtonConfirm', async () => {});
    }

    render() {
        return <Layout engine={this.engine} content={layout} key={'content1'}/>;
    }
}

function uploadImage(file: string | Blob, propName: string) {
    return of(0.5);
}


export default App;
