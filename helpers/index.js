module.exports = {
    convertDay: (date) => {
        let tgl = new Date(date);
        let hari = tgl.getDay();
        if (hari === 0) {
            hari = 'Minggu';
        }
        if (hari === 1) {
            hari = 'Senin';
        }
        if (hari === 2) {
            hari = 'Selasa';
        }
        if (hari === 3) {
            hari = 'Rabu';
        }
        if (hari === 4) {
            hari = 'Kamis';
        }
        if (hari === 5) {
            hari = 'Jumat';
        }
        if (hari === 6) {
            hari = 'Sabtu';
        }
        return hari;
    }
}