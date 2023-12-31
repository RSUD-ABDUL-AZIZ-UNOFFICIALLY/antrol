const { pool } = require('../connection');

module.exports = {
    getKdPoli: async (kodepoli) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query("SELECT kd_poli_rs FROM maping_poli_bpjs WHERE kd_poli_bpjs= ?", [kodepoli]);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getKdDokter: async (kodedokter) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query("SELECT kd_dokter, nm_dokter_bpjs FROM maping_dokter_dpjpvclaim WHERE kd_dokter_bpjs= ?", [kodedokter]);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getKouta: async (kodedokter, hari, jampraktek) => {
        let conn, data;
        let jammulai = jampraktek.substring(0, 5);
        let jamselesai = jampraktek.substring(6, 11);
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT kuota FROM jadwal WHERE kd_dokter='${kodedokter}' AND hari_kerja='${hari}' AND jam_mulai='${jammulai}:00' AND jam_selesai='${jamselesai}:00'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getJadwal: async (kodedokter, hari, jampraktek) => {
        let conn, data;
        let jammulai = jampraktek.substring(0, 5);
        let jamselesai = jampraktek.substring(6, 11);
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT kd_dokter,hari_kerja,jam_mulai,jam_selesai FROM jadwal WHERE kd_dokter='${kodedokter}' AND hari_kerja='${hari}' AND jam_mulai='${jammulai}:00' AND jam_selesai='${jamselesai}:00'`);
        }
        finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getCountNomorReferensi: async (nomorreferensi) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT COUNT(nomorreferensi) as total FROM referensi_mobilejkn_bpjs WHERE (status='Belum' OR status='Checkin') AND nomorreferensi='${nomorreferensi}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getSudahdaftar: async (kdpoli, kddokter, tanggalperiksa, nomorkartu) => {
        let conn, data;
        // "select count(reg_periksa.no_rawat) from reg_periksa inner join pasien on reg_periksa.no_rkm_medis=pasien.no_rkm_medis where reg_periksa.kd_poli='$kdpoli' and reg_periksa.kd_dokter='$kddokter' and reg_periksa.tgl_registrasi='$decode[tanggalperiksa]' and pasien.no_peserta='$decode[nomorkartu]' "
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT COUNT(reg_periksa.no_rawat) as total FROM reg_periksa INNER JOIN pasien ON reg_periksa.no_rkm_medis=pasien.no_rkm_medis WHERE reg_periksa.kd_poli='${kdpoli}' AND reg_periksa.kd_dokter='${kddokter}' AND reg_periksa.tgl_registrasi='${tanggalperiksa}' AND pasien.no_peserta='${nomorkartu}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getCekPasien: async (nik, nomorkartu) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT pasien.no_rkm_medis, pasien.no_ktp, pasien.no_peserta,namakeluarga,alamatpj,kelurahanpj,tgl_daftar,kecamatanpj,kabupatenpj,propinsipj,keluarga,TIMESTAMPDIFF(YEAR, pasien.tgl_lahir, CURDATE()) as tahun,(TIMESTAMPDIFF(MONTH, pasien.tgl_lahir, CURDATE()) - ((TIMESTAMPDIFF(MONTH, pasien.tgl_lahir, CURDATE()) div 12) * 12)) as bulan,
            TIMESTAMPDIFF(DAY, DATE_ADD(DATE_ADD(pasien.tgl_lahir,INTERVAL TIMESTAMPDIFF(YEAR, pasien.tgl_lahir, CURDATE()) YEAR), INTERVAL TIMESTAMPDIFF(MONTH, pasien.tgl_lahir, CURDATE()) - ((TIMESTAMPDIFF(MONTH, pasien.tgl_lahir, CURDATE()) div 12) * 12) MONTH), CURDATE()) as hari FROM pasien where pasien.no_ktp='${nik}' and pasien.no_peserta='${nomorkartu}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },

    getSisaKuota: async (kdpoli, kddokter, tanggalperiksa) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT COUNT(no_rawat) as total FROM reg_periksa WHERE kd_poli='${kdpoli}' AND kd_dokter='${kddokter}' AND tgl_registrasi='${tanggalperiksa}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    noRegPoli: async (kd_poli, kd_dokter, tanggal) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT IFNULL(MAX(CONVERT(no_reg,signed)),0)+1 as total FROM reg_periksa WHERE kd_poli='${kd_poli}' AND kd_dokter='${kd_dokter}' AND tgl_registrasi='${tanggal}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;

    },
    maxRegPoli: async (tanggalperiksa) => {

        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT IFNULL(MAX(CONVERT(RIGHT(no_rawat,6),signed)),0)+1 as total FROM reg_periksa WHERE tgl_registrasi='${tanggalperiksa}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    maxBoking: async (tanggalperiksa) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT IFNULL(MAX(CONVERT(RIGHT(nobooking,6),signed)),0)+1 as total FROM referensi_mobilejkn_bpjs WHERE tanggalperiksa='${tanggalperiksa}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    statusPoli: async (no_rkm_medis, kdpoli) => {

        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT IF(
                (SELECT COUNT(no_rkm_medis) FROM reg_periksa WHERE no_rkm_medis='${no_rkm_medis}' AND kd_poli='${kdpoli}') > 0,
                'Lama',
                'Baru'
              ) AS status_pendaftaran`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    bookingmobilejkn: async ({ nobooking, no_rawat, nomorkartu, nik, nohp, kodepoli, pasienbaru, norm, tanggalperiksa, kodedokter, jampraktek, jeniskunjungan, nomorreferensi, nomorantrean, angkaantrean, estimasidilayani, sisakuotajkn, kuotajkn, sisakuotanonjkn, kuotanonjkn, status, validasi, statuskirim }) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`INSERT INTO referensi_mobilejkn_bpjs 
            (nobooking,no_rawat,nomorkartu,nik,nohp,kodepoli ,pasienbaru,norm,tanggalperiksa,kodedokter,jampraktek,jeniskunjungan,nomorreferensi,nomorantrean ,angkaantrean ,estimasidilayani ,sisakuotajkn ,kuotajkn ,sisakuotanonjkn ,kuotanonjkn ,status  ,validasi,statuskirim ) 
            VALUES('${nobooking}','${no_rawat}', '${nomorkartu}', '${nik}', '${nohp}', '${kodepoli}','${pasienbaru}', '${norm}', '${tanggalperiksa}', '${kodedokter}', '${jampraktek}', '${jeniskunjungan}', '${nomorreferensi}','${nomorantrean}' ,'${angkaantrean}' ,'${estimasidilayani}' ,'${sisakuotajkn}' ,'${kuotajkn}' ,'${sisakuotanonjkn}' ,'${kuotanonjkn}' ,'${status}'  ,'${validasi}','${statuskirim}')`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    bookRegPeriksa: async ({ no_reg, no_rawat, tgl_registrasi, jam_reg, kd_dokter, no_rkm_medis, kd_poli, p_jawab, almt_pj, hubunganpj, biaya_reg, stts, stts_daftar, status_lanjut, kd_pj, umurdaftar, sttsumur, status_bayar, status_poli,
    }) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`INSERT INTO reg_periksa 
            (no_reg,no_rawat,tgl_registrasi,jam_reg,kd_dokter,no_rkm_medis,kd_poli,p_jawab,almt_pj,hubunganpj,biaya_reg,stts,stts_daftar,status_lanjut,kd_pj,umurdaftar,sttsumur,status_bayar,status_poli) 
            VALUES('${no_reg}','${no_rawat}', '${tgl_registrasi}', '${jam_reg}', '${kd_dokter}', '${no_rkm_medis}','${kd_poli}', '${p_jawab}', '${almt_pj}', '${hubunganpj}', '${biaya_reg}', '${stts}', '${stts_daftar}', '${status_lanjut}', '${kd_pj}', '${umurdaftar}', '${sttsumur}', '${status_bayar}', '${status_poli}')`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    findRegPerikasa: async (tgl_registrasi, no_rkm_medis, kd_poli) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT * FROM reg_periksa WHERE tgl_registrasi='${tgl_registrasi}' AND no_rkm_medis='${no_rkm_medis}' AND kd_poli='${kd_poli}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getPoliklinik: async (kdpoli) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`select * from poliklinik where kd_poli='${kdpoli}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getBooking: async (nobooking) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`select * from referensi_mobilejkn_bpjs where nobooking='${nobooking}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getRegis: async (no_rawat) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`select * from reg_periksa where no_rawat='${no_rawat}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getTotalAntrean: async (kodedokter, kodepoli, tanggalperiksa, noreg) => {

        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT reg_periksa.kd_poli,poliklinik.nm_poli,dokter.nm_dokter,
            reg_periksa.no_reg,COUNT(reg_periksa.no_rawat) as total_antrean,
            IFNULL(SUM(CASE WHEN reg_periksa.stts ='Belum' THEN 1 ELSE 0 END),0) as sisa_antrean
            FROM reg_periksa INNER JOIN poliklinik ON poliklinik.kd_poli=reg_periksa.kd_poli
            INNER JOIN dokter ON dokter.kd_dokter=reg_periksa.kd_dokter
            WHERE reg_periksa.kd_dokter='${kodedokter}' and reg_periksa.kd_poli='${kodepoli}'and reg_periksa.tgl_registrasi='${tanggalperiksa}' and CONVERT(RIGHT(reg_periksa.no_reg,3),signed)<CONVERT(RIGHT(${noreg},3),signed)`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getRegisStt: async (kodedokter, kodepoli, tanggalperiksa, stts) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT * FROM reg_periksa WHERE kd_dokter='${kodedokter}'AND kd_poli='${kodepoli}'AND tgl_registrasi='${tanggalperiksa}' AND stts='${stts}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },

    findReg: async (no_rawat) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT * FROM reg_periksa WHERE no_rawat='${no_rawat}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    updateCekin: async (kodebooking) => {

        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`UPDATE referensi_mobilejkn_bpjs SET status='Checkin',validasi=now() WHERE nobooking='${kodebooking}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getNamaPoli: async (kdpoli) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT nm_poli FROM poliklinik WHERE kd_poli='${kdpoli}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    },
    getJadwalOperasiRS: async (tanggalawal, tanggalakhir) => {
        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`SELECT booking_operasi.no_rawat,booking_operasi.tanggal,paket_operasi.nm_perawatan,maping_poli_bpjs.kd_poli_bpjs,maping_poli_bpjs.nm_poli_bpjs,booking_operasi.status,pasien.no_peserta 
        FROM booking_operasi INNER JOIN reg_periksa ON booking_operasi.no_rawat = reg_periksa.no_rawat INNER JOIN pasien ON pasien.no_rkm_medis = reg_periksa.no_rkm_medis INNER JOIN paket_operasi ON booking_operasi.kode_paket = paket_operasi.kode_paket
        INNER JOIN maping_poli_bpjs ON maping_poli_bpjs.kd_poli_rs=reg_periksa.kd_poli WHERE booking_operasi.tanggal BETWEEN '${tanggalawal}' AND '${tanggalakhir}' ORDER BY booking_operasi.tanggal,booking_operasi.jam_mulai`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return data;
    }
}