const raf = require('raf');
const sendAction = require('send-action');
const yo = require('yo-yo');
const view = require('./view');

const DEFAULT_CORRECT_MARGIN = 0.15;

const quiz = (config) => {
    const correctMargin = config.correctMargin || DEFAULT_CORRECT_MARGIN;
    
    const send = sendAction({
        onaction: (params, state) => {
            let question;

            if (params.id != null) {
                question = state.questions[params.id];
            }

            switch (params.type) {
                case 'identify':
                    if (state.identity !== null) {
                        break;
                    }
                    state.identity = params.identity;
                    setTimeout(send.event('create'), 750);
                    break;
                case 'create':
                    if ((state.identity === null && params.ignoreIdentity !== true) || state.questions !== null) {
                        break;
                    }
                    state.questions = questionsForIdentity(config, state.identity);
                    break;
                case 'guess':
                    if (question.isSubmitted) {
                        break;
                    }
                    question.guess = +params.guess;
                    break;
                case 'submit':
                    if (question.guess === null) {
                        break;
                    }
                    question.isSubmitted = true;
                    setTimeout(send.event('reveal', {id: params.id}), 500);
                    break;
                case 'reveal':
                    const diff = Math.abs(question.guess - question.answers[question.demographic]);
                    question.result = Math.max(0, Math.round(10 * (correctMargin - diff) / correctMargin) / 10);

                    if (state.questions.every(isResultGiven)) {
                        setTimeout(send.event('complete'), 1000);
                    }
                    break;
                case 'complete':
                    state.isComplete = true;
                    break;
                default:
                    break;
            }

            return state;
        },
        onchange: (params, state) => {
            raf(() => {
                yo.update(el, view(state, send));
            });
        },
        state: {
            config: config,
            title: document.title.split(' -')[0],
            identity: null,
            questions: null,
            encodedURL: encodeURIComponent(window.location.href),
            isComplete: false
        }
    });

    const el = view(send.state(), send);

    if (config.identityMappings == null) {
        send('create', {ignoreIdentity: true});
    }

    guessHandler(el, send);

    return el;
};

const guessHandler = (el, send) => {
    let isPointerDown = false;
    let startPosition = null;
    let determinedAxis = null;
    let message = null;

    const onStart = (e) => {
        isPointerDown = true;

        pointerHandler(e);
    };

    const pointerHandler = (e) => {
        let target = e.target;
        const point = e.touches == null ? e : e.touches[0];
        const position = {x: point.clientX, y: point.clientY};

        if (startPosition === null) {
            startPosition = position;
        }

        while (target !== el && target.className !== 'QuizQuestionInput') {
            target = target.parentElement;

            if (target === null) {
                return;
            }
        }

        if (target === el) {
            return;
        }

        const id = +target.id.split('--')[1];

        if (send.state().questions[id].isSubmitted) {
            return;
        }

        const diff = {
            x: Math.abs(startPosition.x - position.x),
            y: Math.abs(startPosition.y - position.y)
        };

        if (determinedAxis === null) {
            if ((diff.x > 3 || diff.y > 3)) {
                determinedAxis = diff.x > diff.y ? 'horizontal' : 'vertical';
            }
        }

        if (determinedAxis === null && (diff.x > 0 || diff.y > 0)) {
            message = null;
            return;
        } 

        const rect = target.getBoundingClientRect();
        const guess = Math.max(0, Math.min(1, (point.clientX - rect.left) / rect.width));

        message = {id: id, guess: guess};

        if (determinedAxis !== 'horizontal') {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        // Temporary UI update that doesn't wait for expensive state-based view

        $(target)
        .find('.QuizQuestionInput-handle')
            .css('transform', 'translate(' + (guess * 100) + '%, 0)')
            .end()
        .find('.QuizQuestionInput-marker.is-demographic')
            .css('transform', 'translate(' + (guess * 100) + '%, 0)');
    };

    const conditionalPointerHandler = (e) => {
        if (isPointerDown) {
            pointerHandler(e);
        }
    };

    const onEnd = () => {
        if (determinedAxis !== 'vertical' && message !== null) {
            send('guess', message);
        }

        message = null;
        isPointerDown = false;
        startPosition = null;
        determinedAxis = null;
    };

    el.addEventListener('mousedown', onStart, false);
    el.addEventListener('touchstart', onStart, false);

    el.addEventListener('mousemove', conditionalPointerHandler, false);
    document.addEventListener('touchmove', pointerHandler, false);

    el.addEventListener('mouseup', onEnd, false);
    el.addEventListener('touchend', onEnd, false);
    // el.addEventListener('mouseleave', onEnd, false);
    document.addEventListener('touchcancel', onEnd, false);
};

const questionsForIdentity = (config, identity) => {
    const pool = identity == null ? null : config.identityMappings[identity];

    return config.questions.map((question, index) => {
        const demographic = pool == null ? question.demographic : pool[index % pool.length];

        return {
            text: question.text.replace('{d}', demographic),
            statement: question.statement,
            explanation: question.explanation,
            relatedStoryId: question.relatedStoryId,
            range: config.ranges[question.range],
            answers: normalizedSortedAnswers(question.answers, demographic),
            demographic: demographic,
            guess: null,
            isSubmitted: false,
            result: null
        };
    });
};

const isResultGiven = (question) => {
    return question.result !== null;
};

const normalizedSortedAnswers = (answers, demographic) => {
    const result = {};

    Object.keys(answers).forEach((key) => {
        if (key === demographic) { return; }

        result[key] = normalizeValue(answers[key]);
    });

    result[demographic] = normalizeValue(answers[demographic]);

    return result;
};

const normalizeValue = (value) => {
    return (value - 1) / 4;
};

module.exports = quiz;
