const raf = require('raf');
const sendAction = require('send-action');
const throttle = require('throttleit');
const yo = require('yo-yo');
const view = require('./view');

const CORRECT_MARGIN = 0.125;

const quiz = (config) => {
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
                    if (state.identity === null || state.questions !== null) {
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
                    question.result = Math.max(0, Math.round(10 * (CORRECT_MARGIN - diff) / CORRECT_MARGIN) / 10);

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

    guessHandler(el, send);

    return el;
};

const guessHandler = (el, send) => {
    let isMouseDown = false;

    const onMouseStart = (e) => {
        isMouseDown = true;
        pointerHandler(e);
    };

    const onMouseEnd = () => {
        isMouseDown = false;
    };

    const conditionalPointerHandler = (e) => {
        if (isMouseDown) {
            pointerHandler(e);
        }
    };

    const pointerHandler = throttle((e) => {
        let target = e.target;

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

        const rect = target.getBoundingClientRect();
        const point = e.touches == null ? e : e.touches[0];
        const guess = Math.max(0, Math.min(1, (point.clientX - rect.left) / rect.width));

        e.preventDefault();
        e.stopPropagation();

        send('guess', {id: id, guess: guess});
    }, 100);

    el.addEventListener('mousedown', onMouseStart, false);
    document.addEventListener('mousemove', conditionalPointerHandler, false);
    el.addEventListener('mouseup', onMouseEnd, false);
    document.addEventListener('mouseleave', onMouseEnd, false);
    el.addEventListener('touchstart', pointerHandler, false);
    document.addEventListener('touchmove', pointerHandler, false);  
};

const questionsForIdentity = (config, identity) => {
    const pool = config.identityMappings[identity];

    return config.questions.map((question, index) => {
        const demographic = pool[index % pool.length];

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
