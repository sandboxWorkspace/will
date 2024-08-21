const minimumStock = [
    ['Purple Alcohol Wipes', 4],
    ['Orange Bleach Wipes', 2],
    ['Small Gloves', 3],
    ['Medium Gloves', 5],
    ['Large Gloves', 3],
    ['Coband 3m', 2]
];

const sections = [
    {
        questions: [
            { type: 'textbox', label: 'Name: ', required: true, placeholder: 'Please enter your name' },
            { type: 'multiple', label: 'Supply Category:', options: [
                    'Cleaning (Wipes, Gloves Chemicals)',
                    'Adhesives (Tape, Wraps, Remover)',
                    'Therapy Supplies (Electrodes, Bands/Putty, Consumables, etc...)',
                    'Hygiene & First Aid (Cups, Tissues, Masks, Emesis, Bandages, etc...)',
                    'Misc & Office (Printer, Batteries, etc...)'
                ], required: true, allowMultiple: true, hasOther: true }
        ]
    },
    {
        questions: [
            { type: 'multiple', label: 'Cleaning Supplies:', options: [
                    'Purple Alcohol Wipes',
                    'Orange Bleach Wipes',
                    'Small Gloves',
                    'Medium Gloves',
                    'Large Gloves',
                    'Chemical Agents (Distilled Water, Vinegar, Detergent, Bleach Tablets, etc...)'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Cleaning (Wipes, Gloves Chemicals)' },
            { type: 'multiple', label: 'Adhesive Supplies:', options: [
                    'Coband 3m',
                    '3" Ace Wrap',
                    '4" Ace wrap',
                    '6" Ace wrap',
                    'Painter\'s Tape',
                    'Clear Transpore Tape',
                    'White Transpore Tape',
                    '3" Kineseo Tex (Gold Rev)',
                    '2" Kineseo Tex (Blue Classic',
                    'Leukotape P',
                    'Leukoplast CoverRoll Stretch',
                    'Adhesive Remover',
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Adhesives (Tape, Wraps, Remover)' },
            { type: 'multiple', label: 'Therapy  Supplies:', options: [
                    'Electrodes',
                    'NMES',
                    'Theraband',
                    'Theraputty',
                    'Evaluation Forms',
                    'Dycem',
                    'Biofreeze',
                    'Deep Prep',
                    'Foam Tube',
                    'Splint Materials (Velfoam, Velcro, etc...)',
                    'Speech (Food, Liquids, Glycerin Oral Swab, etc..)'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Therapy Supplies (Electrodes, Bands/Putty, Consumables, etc...)' },
            { type: 'multiple', label: 'Hygiene & First Aid Supplies:', options: [
                    'Cups (12oz Styrofoam)',
                    'Facial Tissues',
                    'Surgical Masks',
                    'Hand Sanitizer',
                    'Emesis Bag (12pk)',
                    'Bandages',
                    'Alcohol Prep Pad'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Hygiene & First Aid (Cups, Tissues, Masks, Emesis, Bandages, etc...)' },
            { type: 'multiple', label: 'Misc & Office Supplies:', options: [
                    'Printer Toner/Ink',
                    'Packing Tape',
                    'Batteries',
                    'Printer Paper',
                    'Command Strips'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Misc & Office (Printer, Batteries, etc...)' }
        ]
    },
    {
        questions: [
            { type: 'multiple', label: 'Chemical Agents:', options: [
                    'Distilled Water',
                    'Vinegar',
                    'Laundry Detergent',
                    'Bleach Tablets'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Chemical Agents (Distilled Water, Vinegar, Detergent, Bleach Tablets, etc...)' },
            { type: 'multiple', label: 'Electrodes:', options: [
                    '3 x 4 Large (2pc)',
                    '2 x 3.5 Medium (4pc)',
                    '2 Square (4pc)" ',
                    '1.25 Circle (4pc)'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Electrodes' },
            { type: 'multiple', label: 'Theraband:', options: [
                    'Yellow',
                    'Red',
                    'Green',
                    'Blue',
                    'Black',
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Theraband' },
            { type: 'multiple', label: 'Theraputty:', options: [
                    'Yellow (X-Soft)',
                    'Red (Soft)',
                    'Green (Medium)',
                    'Blue (Firm)'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Hygiene & First Aid (Cups, Tissues, Masks, Emesis, Bandages, etc...)' },
            { type: 'multiple', label: 'Batteries:', options: [
                    'AAA',
                    'AA',
                    '9V',
                    'C',
                    'D'
                ], required: true, allowMultiple: true, hasOther: true, condition: 'Batteries' }
        ]
    },
    {
        questions: [
            minimumStock.map(item => ({
            type: 'multiple',
            label: `Is ${item[0]} inventory less than ${item[1]}?`,
            options: ['Yes', 'No'],
            required: true,
            allowMultiple: false
        }))
        ]
    },
    {
        questions: [
            { type: 'textbox', label: 'Location, quantity left/requesting, specific instructions, etc...', required: false }
        ]
    }
];

let currentSectionIndex = 0;
let selectedCategories = [];
let formData = {};

document.addEventListener('DOMContentLoaded', () => {
    renderSection();
    document.getElementById('dynamic-form').addEventListener('submit', handleSubmit);
});

function renderSection() {
    const sectionContainer = document.getElementById('section-container');
    sectionContainer.innerHTML = '';

    const section = sections[currentSectionIndex];
    section.questions.forEach((question) => {
        if (currentSectionIndex === 0 || !question.condition || selectedCategories.includes(question.condition)) {
            const questionElement = document.createElement('div');
            questionElement.classList.add('question');

            const label = document.createElement('label');
            label.textContent = question.label;
            questionElement.appendChild(label);

            if (question.type === 'textbox') {
                const input = document.createElement('input');
                input.type = 'text';
                input.name = question.label;
                input.required = question.required;
                input.placeholder = question.placeholder || '';
                input.value = formData[question.label] || '';
                questionElement.appendChild(input);
            } else if (question.type === 'multiple') {
                question.options.forEach((option, i) => {
                    const optionContainer = document.createElement('div');
                    const input = document.createElement('input');
                    const id = `${question.label}-${i}`;  
                    input.type = question.allowMultiple ? 'checkbox' : 'radio';
                    input.name = question.label;
                    input.id = id;
                    input.value = option;
                    input.required = question.required;
                    if (formData[question.label] && formData[question.label].includes(option)) {
                        input.checked = true;
                    }
                    optionContainer.appendChild(input);

                    const optionLabel = document.createElement('label');
                    optionLabel.textContent = option;
                    optionLabel.setAttribute('for', id);  
                    optionContainer.appendChild(optionLabel);

                    questionElement.appendChild(optionContainer);
                });

                if (question.hasOther) {
                    const otherContainer = document.createElement('div');
                    const otherCheckbox = document.createElement('input');
                    const otherId = `${question.label}-other`;  
                    otherCheckbox.type = question.allowMultiple ? 'checkbox' : 'radio';
                    otherCheckbox.name = question.label;
                    otherCheckbox.id = otherId;  
                    otherCheckbox.value = 'Other: ';
                    otherContainer.appendChild(otherCheckbox);

                    const otherLabel = document.createElement('label');
                    otherLabel.setAttribute('for', otherId);  
                    otherLabel.textContent = 'Other: ';
                    otherContainer.appendChild(otherLabel);

                    const otherInput = document.createElement('input');
                    otherInput.type = 'text';
                    otherInput.placeholder = 'Please specify';
                    otherInput.name = `${question.label} Other`;
                    otherInput.value = formData[`${question.label} Other`] || '';
                    otherInput.addEventListener('input', () => {
                        otherCheckbox.checked = otherInput.value.trim() !== '';
                        otherCheckbox.value = otherInput.value;
                    });
                    otherContainer.appendChild(otherInput);
                    questionElement.appendChild(otherContainer);
                }
            }

            sectionContainer.appendChild(questionElement);
        }
    });

    updateNavigationButtons();
}

function updateNavigationButtons() {
    document.getElementById('prev-button').style.display = currentSectionIndex > 0 ? 'inline' : 'none';
    document.getElementById('next-button').style.display = currentSectionIndex < sections.length - 1 ? 'inline' : 'none';
    document.getElementById('submit-button').style.display = currentSectionIndex === sections.length - 1 ? 'inline' : 'none';
}

function prevSection() {
    if (currentSectionIndex > 0) {
        currentSectionIndex--;
        renderSection();
    }
}

function nextSection() {
    if (validateSection()) {
        saveSectionData();
        if (currentSectionIndex < sections.length - 1) {
            currentSectionIndex++;
            renderSection();
        }
    }
}

function validateSection() {
    const section = sections[currentSectionIndex];
    let isValid = true;

    section.questions.forEach(question => {
        if (question.required) {
            const inputs = document.getElementsByName(question.label);
            const isChecked = Array.from(inputs).some(input => input.checked || (input.type === 'text' && input.value.trim() !== ''));
            if (!isChecked) {
                isValid = false;
                alert(`Please answer: ${question.label}`);
            }
        }
    });

    return isValid;
}

function saveSectionData() {
    const section = sections[currentSectionIndex];
    const previousCategories = [...selectedCategories];

    section.questions.forEach(question => {
        const inputs = document.getElementsByName(question.label);
        if (question.type === 'textbox') {
            formData[question.label] = inputs[0].value;
        } else if (question.type === 'multiple') {
            const selectedOptions = Array.from(inputs)
                .filter(input => input.checked)
                .map(input => input.value);

            formData[question.label] = selectedOptions;

            if (question.hasOther) {
                const otherInput = document.getElementsByName(`${question.label} Other`)[0];
                if (otherInput.value.trim() !== '') {
                    formData[`${question.label} Other`] = otherInput.value;
                }
            }

            if (currentSectionIndex === 0 && question.label === 'Supply Category:') {
                selectedCategories = selectedOptions;
            }
        }
    });

    // Clear formData for deselected categories
    if (currentSectionIndex === 0) {
        previousCategories.forEach(category => {
            if (!selectedCategories.includes(category)) {
                sections[1].questions.forEach(subQuestion => {
                    if (subQuestion.condition === category) {
                        delete formData[subQuestion.label];
                    }
                });
            }
        });
    }
}

function handleSubmit(event) {
    event.preventDefault();
    if (validateSection()) {
        saveSectionData();
        console.log('Form Data:', formData);
        alert('Form submitted successfully!');
    }
}
