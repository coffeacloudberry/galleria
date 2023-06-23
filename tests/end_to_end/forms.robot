*** Settings ***
Documentation     Contact form validation
Resource          resource.robot

*** Variables ***
${CONTACTFORM}       xpath://form[@id="contact-form"]

*** Test Cases ***
Check Contact Form Validation
    Open Browser To Landing Page
    Go From Content To About Page
    Element Should Be Visible        ${CONTACTFORM}//input[@type="text"]
    Element Should Not Be Visible    ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Be Visible        ${CONTACTFORM}//textarea
    Element Should Not Be Visible    ${CONTACTFORM}//textarea[@class="invalid"]

    Click Button                     ${CONTACTFORM}//button[@type="submit"]
    Element Should Contain           ${CONTACTFORM}  Say something!
    Element Should Be Visible        ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Contain           ${CONTACTFORM}  Say something!
    Element Should Be Visible        ${CONTACTFORM}//textarea[@class="invalid"]

    Input Text                       ${CONTACTFORM}//input[@type="text"]    bad email
    Element Should Contain           ${CONTACTFORM}  Say something!
    Element Should Be Visible        ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Contain           ${CONTACTFORM}  Say something!
    Element Should Be Visible        ${CONTACTFORM}//textarea[@class="invalid"]

    Input Text                       ${CONTACTFORM}//input[@type="text"]    robotframework@example.com
    Element Should Not Contain       ${CONTACTFORM}  Invalid email address!
    Element Should Not Be Visible    ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Contain           ${CONTACTFORM}  Say something!
    Element Should Be Visible        ${CONTACTFORM}//textarea[@class="invalid"]

    Input Text                       ${CONTACTFORM}//input[@type="text"]    bad email
    Input Text                       ${CONTACTFORM}//textarea    blabla
    Textarea Should Contain          ${CONTACTFORM}//textarea   blabla
    Element Should Not Contain       ${CONTACTFORM}  Invalid email address!
    Element Should Not Be Visible    ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Not Contain       ${CONTACTFORM}  Say something!
    Element Should Not Be Visible    ${CONTACTFORM}//textarea[@class="invalid"]

    Click Button                     ${CONTACTFORM}//button[@type="submit"]
    Element Should Contain           ${CONTACTFORM}  Invalid email address!
    Element Should Be Visible        ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Not Contain       ${CONTACTFORM}  Say something!
    Element Should Not Be Visible    ${CONTACTFORM}//textarea[@class="invalid"]

    Input Text                       ${CONTACTFORM}//input[@type="text"]    ${SPACE}robotframework@example.com${SPACE*3}
    Input Text                       ${CONTACTFORM}//textarea    blabla
    Element Should Not Contain       ${CONTACTFORM}  Invalid email address!
    Element Should Not Be Visible    ${CONTACTFORM}//input[@type="text" and @class="invalid"]
    Element Should Not Contain       ${CONTACTFORM}  Say something!
    Element Should Not Be Visible    ${CONTACTFORM}//textarea[@class="invalid"]

Check Bug Report Generator
    Reload Page
    Input Text                       ${CONTACTFORM}//textarea    blabla
    Click Button                     ${CONTACTFORM}//button[@id="bug-report-button"]
    Click Button                     xpath://button[@class="modal-close "]
    Textarea Should Contain          ${CONTACTFORM}//textarea   blabla
    Textarea Should Contain          ${CONTACTFORM}//textarea   My user agent is 'Mozilla

    [Teardown]    Close Browser
