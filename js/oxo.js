$(document).ready(function() {
    $('.block').equalHeights(true);
    $('.content').css('display', 'none');
    $('.section .file').css('display', 'none');

    $('.header').click(function() {
        $(this).siblings().fadeToggle();
    });
});
