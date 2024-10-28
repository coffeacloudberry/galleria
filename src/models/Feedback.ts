class Feedback {
    text_content = "";
    is_open = false;
    is_sending = false;
}

/** This is a shared instance. */
export const feedback = new Feedback();
