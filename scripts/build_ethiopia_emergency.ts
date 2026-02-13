
import fs from 'fs';
import path from 'path';

type OverpassElement = {
    id: number;
    lat?: number;
    lon?: number;
    tags?: { [k: string]: string };
};

type Facility = {
    id: string;
    type: 'hospital' | 'clinic' | 'police' | 'other';
    name: string;
    phone?: string;
    lat: number;
    lon: number;
    address?: string;
};

// Adjust path as needed based on where you run the script from
const RAW_FILE_PATH = path.join(process.cwd(), 'ethiopia_raw.json');
const OUTPUT_FILE_PATH = path.join(process.cwd(), 'src/data/ethiopia_emergency.json'); // Saving to src/data so it can be imported

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE_PATH);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    const rawData = fs.readFileSync(RAW_FILE_PATH, 'utf8');
    const raw = JSON.parse(rawData);
    const elements: OverpassElement[] = raw.elements || [];

    const facilities: Facility[] = elements
        .filter(e => e.lat && e.lon && e.tags && e.tags.amenity)
        .map(e => {
            const t = e.tags!;
            const type =
                t.amenity === 'hospital' ? 'hospital' :
                    t.amenity === 'clinic' ? 'clinic' :
                        t.amenity === 'police' ? 'police' : 'other';

            return {
                id: `${type}_${e.id}`,
                type,
                name: t.name || 'Unknown',
                phone: t.phone || t['contact:phone'],
                lat: e.lat!,
                lon: e.lon!,
                address: [t['addr:city'], t['addr:street']].filter(Boolean).join(', ')
            };
        });

    fs.writeFileSync(
        OUTPUT_FILE_PATH,
        JSON.stringify(facilities, null, 2),
        'utf8'
    );
    console.log(`Successfully generated ${OUTPUT_FILE_PATH} with ${facilities.length} facilities.`);

} catch (error) {
    console.error("Error processing emergency data:", error);
}
