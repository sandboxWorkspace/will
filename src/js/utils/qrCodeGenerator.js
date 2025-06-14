import { debounce, setupToggleSwitch } from './utils.js';
import QRCode from 'qrcode';

document.addEventListener('DOMContentLoaded', () => {
    const qrDataInput = document.getElementById('qrData');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const colorToggleSwitch = document.getElementById('colorToggleSwitch');
    const downloadPNGBtn = document.getElementById('downloadPNGBtn');

    if (!qrDataInput || !qrCodeContainer || !colorToggleSwitch || !downloadPNGBtn) {
        console.error("QR Code Generator: One or more essential DOM elements are missing.");
        return;
    }

    let isDarkOnLight = colorToggleSwitch.checked; // Initialize based on switch's default state
    let currentQrText = "";

    const displaySize = 256;
    const exportSize = 2048;

    function getColors() {
        return {
            fgColor: isDarkOnLight ? '#000000' : '#FFFFFF',
            bgColor: isDarkOnLight ? '#FFFFFF' : '#000000'
        };
    }

    async function generateOrUpdateQRCode() {
        currentQrText = qrDataInput.value.trim();
        const colors = getColors();

        qrCodeContainer.innerHTML = ''; // Clear previous QR code

        if (!currentQrText) {
            qrCodeContainer.innerHTML = '<p>Generating QR code...</p>';
            return;
        }

        const options = {
            width: displaySize,
            margin: 1, // Small margin
            color: {
                dark: colors.fgColor,
                light: colors.bgColor
            },
            errorCorrectionLevel: 'H' // High error correction
        };

        try {
            const dataUrl = await QRCode.toDataURL(currentQrText, options);
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = "QR Code";
            qrCodeContainer.appendChild(img);
        } catch (error) {
            console.error("Error generating QR Code:", error);
            qrCodeContainer.innerHTML = '<p>Error generating QR code. Check console.</p>';
        }
    }

    const debouncedGenerateOrUpdateQRCode = debounce(generateOrUpdateQRCode, 300);

    qrDataInput.addEventListener('input', debouncedGenerateOrUpdateQRCode);

    // Drag and drop support for text files and text snippets
    qrDataInput.addEventListener('dragover', (event) => {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    });

    qrDataInput.addEventListener('drop', (event) => {
        event.stopPropagation();
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.match('text.*')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    qrDataInput.value = e.target.result;
                    generateOrUpdateQRCode(); // Update immediately
                };
                reader.readAsText(file);
            } else {
                alert("Please drop a text file.");
            }
        } else {
            const textData = event.dataTransfer.getData('text/plain');
            if (textData) {
                qrDataInput.value = textData;
                generateOrUpdateQRCode(); // Update immediately
            }
        }
    });

    setupToggleSwitch(colorToggleSwitch, (isChecked) => {
        isDarkOnLight = isChecked;
        generateOrUpdateQRCode();
    });    

    async function downloadQRCode(filename, size) {
        if (!currentQrText) {
            alert("Please enter data to generate a QR code first.");
            return;
        }

        const colors = getColors();
        const options = {
            width: size,
            margin: 2, // Slightly larger margin for downloaded image
            color: {
                dark: colors.fgColor,
                light: colors.bgColor
            },
            errorCorrectionLevel: 'H'
        };

        try {
            const dataURL = await QRCode.toDataURL(currentQrText, options);
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = filename;
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error preparing QR code for download:", error);
            alert("Error preparing QR code for download. Check console.");
        }
    }

    downloadPNGBtn.addEventListener('click', () => {
        downloadQRCode('qrcode.png', exportSize);
    });

    // Initial placeholder or empty state
    generateOrUpdateQRCode();
});
