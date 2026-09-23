export function registerFonts(moduleId) {
    // Relative so they work under a route prefix
    const url = (file) => `modules/${moduleId}/fonts/${file}.woff2`;
    CONFIG.fontDefinitions.Inter = {
        editor: true,
        fonts: [
            { urls: [url('inter-400')] },
            {
                urls: [url('inter-600')],
                weight: '600'
            }
        ]
    };
    CONFIG.fontDefinitions.Manrope = {
        editor: true,
        fonts: [{
                urls: [url('manrope-600')],
                weight: '600'
            }]
    };
}
