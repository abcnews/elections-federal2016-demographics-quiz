const yo = require('yo-yo');

const VERY_CLOSE_RESPONSES = [
    'Woo hoo! You get | for\xA0being\xA0so\xA0right.',
    'Yep, you got it. |!',
    'Nice one! | for you\xA0😄'
];
const CLOSE_RESPONSES = [
    'So close! You get | for\xA0that\xA0one.',
    'Not bad! 😉 | for you.',
    'Nearly, but not quite. |.'
];
const DISTANT_RESPONSES = [
    'Nope, that\'s not it. |\xA0for\xA0you.',
    'Sorry, nowhere near. |\xA0😞',
    'Not this time. |.'
];
const QUESTION_POINTS_VALUE = 10;
const VERY_CLOSE_MARGIN = 0.75;

const view = (state, send) => {
    if (state.questions === null) {
        return yo`<div class="Quiz">
            ${identityView(state, send)}
        </div>`;
    }

    return yo`<div class="Quiz">
        <div class="Quiz-questions">
            ${state.questions.map((question, id) => questionView(id, question, send))}
        </div>
        ${state.isComplete ? summaryView(state, send) : ''}
        ${state.isComplete ? '' : progressView(state)}
    </div>`;
};

const identityView = (state, send) => {
    const hasChosen = state.identity !== null;
    const identities = Object.keys(state.config.identityMappings);

    return yo`<div class="QuizIdentity${hasChosen ? ' has-chosen' : ''}">
        <div class="QuizIdentity-text">Before we begin - what's your ${state.config.group}?</div>
        <div class="QuizIdentity-choices">
            ${identities.map((identity) => {
                return yo`<button
                    class="Button"
                    disabled=${hasChosen && identity !== state.identity}
                    onclick=${send.event('identify', {identity: identity})}>${identity}</button>`;
            })}
        </div>
    </div>`;
};

const questionView = (id, question, send) => {
    let className = 'QuizQuestion';
    if (question.guess !== null) { className += ' has-guess'; }
    if (question.isSubmitted) { className += '  is-submitted'; }
    if (question.result !== null) { className += '  is-revealed'; }

    return yo`<div class="${className}">
        <div class="QuizQuestion-title">Question ${id + 1}</div>
        <div class="QuizQuestion-text">${question.text}</div>
        <div class="QuizQuestion-statement">${question.statement}</div>
        ${questionInputView(id, question)}
        ${questionSubmissionView(id, question, send)}
        ${question.result === null ? '' : questionResultView(id, question)}
    </div>`;
};

const questionInputView = (id, question) => {
    const guessPct = question.guess === null ? 50 : question.guess * 100;

    let gridChildren = question.range.map((name, index) => {
        return yo`<div class="QuizQuestionInput-gridLine" id="QuizQuestionInput-gridLine--${index}"></div>`;
    });

    gridChildren = gridChildren.concat(Object.keys(question.answers).map((key) => {
        const isDemographic = key === question.demographic;
        const pct = isDemographic && question.result === null ? guessPct : (question.answers[key] * 100);

        let className = 'QuizQuestionInput-marker';
        if (isDemographic) {
            className += ' is-demographic';

           if (question.result !== null) {
                className += (question.result > 0 ? ' is-correct' : ' is-incorrect');
            }
        }
        
        return yo`<div
            id="QuizQuestionInput-marker--${key}"
            class="${className}"
            style="margin-left: ${pct}%">
            <div class="QuizQuestionInput-markerLabel">${key}</div>
        </div>`;
    }));

    if (question.result !== null) {
        gridChildren = gridChildren.concat([
            yo`<div
                id="QuizQuestionInput-marker--is-guess"
                class="QuizQuestionInput-marker is-guess"
                style="margin-left: ${guessPct}%">
                <div class="QuizQuestionInput-markerLabel">${question.demographic}</div>
            </div>`
        ]);
    }

    return yo`<div class="QuizQuestionInput" id="QuizQuestionInput--${id}">
            <div class="QuizQuestionInput-grid">
                ${gridChildren}
            </div>
            <div class="QuizQuestionInput-axis">
                ${question.range.map((tick) => { return yo`<div class="QuizQuestionInput-tick">
                    <div class="QuizQuestionInput-tickLabel">${tick}</div>
                </div>`; })}
            </div>
            <div class="QuizQuestionInput-handle" style="left: ${guessPct}%">
                ${id > 0 ? '' : yo`<div class="QuizQuestionInput-handleHint"></div>`}
            </div>
    </div>`;
};

const questionSubmissionView = (id, question, send) => {
    return yo`<div class="QuizQuestionSubmission">
        <button
            class="Button"
            disabled=${question.isSubmitted || question.guess === null}
            onclick=${send.event('submit', {id: id})}>Check${question.isSubmitted ? 'ing' : ' answer'}</button>
    </div>`;
};

const questionResultView = (id, question) => {
    const points = question.result * QUESTION_POINTS_VALUE;
    const responseDict = question.result > VERY_CLOSE_MARGIN ? VERY_CLOSE_RESPONSES : question.result > 0 ? CLOSE_RESPONSES : DISTANT_RESPONSES; 
    const responseParts = responseDict[id % responseDict.length].split('|');

    return yo`<div class="QuizQuestionResult">
        <div class="QuizQuestionResult-text">
            ${responseParts[0]}<span class="QuizQuestionResult-score QuizQuestionResult-score--${question.result > 0 ? 'positive' : 'negative'}">${points}\xA0point${points === 1 ? '' : 's'}</span>${responseParts[1]}
        </div>
        <div class="QuizQuestionResult-explanation">
            ${question.explanation} 
            ${question.relatedStoryId == null ? '' : yo`<a href="/news/${question.relatedStoryId}/" target="_blank" rel="noopener" >Story\xA0»</a>`}
        </div>
    </div>`;
};

const summaryView = (state) => {
    const score = Math.round(state.questions.reduce((memo, question) => { return memo += question.result; }, 0) * QUESTION_POINTS_VALUE);
    const potentialScore = state.questions.length * QUESTION_POINTS_VALUE;
    const encodedText = encodeURIComponent(`I scored ${score}/${potentialScore}. ${state.title}`);
    const facebookURL = `http://www.facebook.com/sharer.php?u=${state.encodedURL}&t=${encodedText}`;
    const twitterURL = `http://twitter.com/intent/tweet?url=${state.encodedURL}&related=abcnews&text=${encodedText}`;

    return yo`<div class="QuizSummary">
        <div class="QuizSummary-scoreLabel">You scored</div>
        <div class="QuizSummary-scoreValue">${score}</div>
        <div class="QuizSummary-scorePotential">out of ${potentialScore}</div>
        <a href="${facebookURL}" target="_blank" rel="noopener" class="QuizSummary-share QuizSummary-share--facebook"></a>
        <a href="${twitterURL}" target="_blank" rel="noopener" class="QuizSummary-share QuizSummary-share--twitter"></a>
        <div class="QuizSummary-shareLabel">Share your score</div>
    </div>`;
};

const progressView = (state) => {
    const answered = state.questions.filter((question) => question.result !== null);
    const correct = answered.filter((question) => question.result === true);
    const score = correct.length * QUESTION_POINTS_VALUE;
    const potentialScore = state.questions.length * QUESTION_POINTS_VALUE;
    const numRemaining = state.questions.length - answered.length;

    return yo`<div class="QuizProgress">
        <div class="QuizProgress-score"><span class="QuizProgress-label">Score</span><span class="QuizProgress-scoreValue">${score}<span class="QuizProgress-scoreValueSplit">/</span>${potentialScore}</span></div>
        <div class="QuizProgress-remaining"><span class="QuizProgress-label">${numRemaining} question${numRemaining === 1 ? '' : 's'} remain${numRemaining === 1 ? 's' : ''}</span></div>
    </div>`;
};

module.exports = view;
