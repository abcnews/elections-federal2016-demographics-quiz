/*!
 * elections-federal2016-demographics-quiz
 *
 * @version development
 * @author Colin Gourlay <gourlay.colin@abc.net.au>
 */

const fastclick = require('fastclick');
const throttle = require('throttleit');
const quiz = require('./Quiz');

const DATA_ATTRIBUTE = 'elections-federal2016-demographics-quiz';
const DATA_ATTRIBUTE_SELECTOR = '[data-' + DATA_ATTRIBUTE + ']';
const CONTAINERS_NOT_FOUND_ERROR = 'No containers found.';
const JSON_URL_NOT_FOUND_ERROR = 'JSON URL not found.';

const viewporter = ($el) => {
    const {top} = $el.position();

    const update = () => {
        const viewportTop = (window.pageYOffset !== undefined) ?
            window.pageYOffset :
            (document.documentElement || document.body.parentNode || document.body).scrollTop;

        if (viewportTop > top) {
            $el.addClass('is-above-top');
        } else {
            $el.removeClass('is-above-top');
        }
    };


    $(window).on('scroll', throttle(update, 50));

    update();
};

const load = ($container) => {
    const jsonURL = $container.data(DATA_ATTRIBUTE);

    if (!jsonURL.length) {
        throw JSON_URL_NOT_FOUND_ERROR;
    }

    $container.unwrap();

    // If last element we unwrapped was just the preview site's
    // <span id="CTX-\d+"> wrapper, we need to unwrap again.
    if ($container.parent().is('.html-fragment')) {
        $container.unwrap();
    }

    viewporter($container);

    $.getJSON(jsonURL, (config) => {
        $container.append(quiz(config));
    });
};

$(() => {
    const $$containers = $(DATA_ATTRIBUTE_SELECTOR);

    if (!$$containers.length) {
        throw CONTAINERS_NOT_FOUND_ERROR;
    }

    $$containers.each((index, el) => {
        load($(el));
    });

    fastclick(document.body);
});