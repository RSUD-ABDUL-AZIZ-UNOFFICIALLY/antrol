require("dotenv").config();
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { pool } = require('../connection');
const { convertDay } = require('../helpers');
const { getKdPoli,
    getKdDokter,
    getKouta,
    getCountNomorReferensi,
    getSudahdaftar,
    getCekPasien,
    getSisaKuota,
    noRegPoli,
    maxRegPoli,
    maxBoking,
    statusPoli,
    getJadwal,
    getPoliklinik,
    bookingmobilejkn,
    findRegPerikasa,
    findReg,
    bookRegPeriksa,
    getTotalAntrean,
    getRegis,
    updateCekin,
    getBooking,
    getNamaPoli,
    getRegisStt
} = require('../model');
const secretKey = process.env.TOKEN_SECRET;

module.exports = {
    auth: async (req, res) => {
        let conn, data;
        try {
            //get header
            let username = req.headers['x-username'];
            let password = req.headers['x-password'];

            if (!username || !password) {
                return res.status(400).json({ message: 'username dan password harus diisi' });
            }
            try {
                conn = await pool.getConnection();
                data = await conn.query("select kd_pj,aes_decrypt(usere,'nur') as user,aes_decrypt(passworde,'windi') as pass FROM password_asuransi");
            } finally {
                if (conn) conn.release(); //release to pool
            }
            let user = Buffer.from(data[0].user).toString('utf8');
            let pass = Buffer.from(data[0].pass).toString('utf8');
            if (username !== user || password !== pass) {
                return res.status(400).json({ message: 'username atau password salah' });
            }
            let token = jwt.sign({
                username: username
            }, secretKey, { expiresIn: '1h' });


            return res.status(200).json(
                {
                    "response": {
                        "token": token
                    },
                    "metadata": {
                        "message": "Ok",
                        "code": 200
                    }
                }
            );
        } catch (err) {
            return res.status(500).json({ message: 'server Error' });
        }
    },
    statusantrean: async (req, res) => {
        let conn, data;
        try {
            let { kodepoli, kodedokter, tanggalperiksa, jampraktek } = req.body;
            if (!kodepoli || !kodedokter || !tanggalperiksa || !jampraktek) {
                return res.status(400).json({ message: 'kodepoli, kodedokter, tanggalperiksa, jampraktek harus diisi' });
            }
            let hari = convertDay(tanggalperiksa);
            let kdpoli, kddokter, kouta, data;
            // let jammulai = jampraktek.substring(0, 5);
            // let jamselesai = jampraktek.substring(6, 11);
            conn = await pool.getConnection();
            kdpoli = await getKdPoli(kodepoli);
            kddokter = await getKdDokter(kodedokter);
            if (kdpoli.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'kodedokter Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            if (kddokter.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Kode Dokter ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            kouta = await getKouta(kddokter[0].kd_dokter, hari, jampraktek);

            if (kouta.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Pendaftaran ke Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            try {
                conn = await pool.getConnection();
                data = await conn.query(`SELECT poliklinik.nm_poli,COUNT(reg_periksa.kd_poli) as total_antrean,dokter.nm_dokter,
                IFNULL(SUM(CASE WHEN reg_periksa.stts ='Belum' THEN 1 ELSE 0 END),0) as sisa_antrean,
                ('Datanglah Minimal 30 Menit, jika no antrian anda terlewat, silakan konfirmasi ke bagian Pendaftaran atau Perawat Poli, Terima Kasih ..') as keterangan
                FROM reg_periksa INNER JOIN poliklinik ON poliklinik.kd_poli=reg_periksa.kd_poli INNER JOIN dokter ON reg_periksa.kd_dokter=dokter.kd_dokter
                WHERE reg_periksa.tgl_registrasi='${tanggalperiksa}' AND reg_periksa.kd_poli='${kdpoli[0].kd_poli_rs}' and reg_periksa.kd_dokter='${kddokter[0].kd_dokter}' 
                and jam_reg between '${jammulai}:00' and '${jamselesai}:00'`);
            } finally {
                if (conn) conn.release(); //release to pool
            }

            if (data.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Pendaftaran ke Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            if (data[0].sisa_antrean == 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Maaf belum ada antrian ditanggal ' + tanggalperiksa + ' jam ' + jampraktek,
                            'code': 201
                        }
                    }
                );
            }
            try {
                conn = await pool.getConnection();
                data[0].no_reg = await conn.query(`select reg_periksa.no_reg from reg_periksa where reg_periksa.stts='Belum' and reg_periksa.kd_dokter='${kddokter[0].kd_dokter}' and reg_periksa.kd_poli='${kdpoli[0].kd_poli_rs}' and reg_periksa.tgl_registrasi='${tanggalperiksa}' order by CONVERT(RIGHT(reg_periksa.no_reg,3),signed) limit 1`);
            } finally {
                if (conn) conn.release(); //release to pool
            }
            return res.status(200).json(
                {
                    "response": {
                        "namapoli": data[0].nm_poli,
                        "namadokter": data[0].nm_dokter,
                        "totalantrean": data[0].total_antrean,
                        "sisaantrean": data[0].sisa_antrean,
                        "antreanpanggil": `${kodepoli}-${data[0].no_reg[0].no_reg}`,
                        "sisakuotajkn": parseInt(kouta[0].kuota - data[0].total_antrean),
                        "kuotajkn": parseInt(kouta[0].kuota),
                        "sisakuotanonjkn": parseInt(kouta[0].kuota - data[0].total_antrean),
                        "kuotanonjkn": parseInt(kouta[0].kuota),
                        "keterangan": data[0].keterangan

                    },
                    "metadata": {
                        "message": "Ok",
                        "code": 200
                    }
                }
            );
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'server Error' });
        }
    },
    ambilantrean: async (req, res) => {
        let conn, data;
        try {
            let { nomorkartu, nik, nohp, kodepoli, norm, tanggalperiksa, kodedokter, jampraktek, jeniskunjungan, nomorreferensi } = req.body;
            if (!nomorkartu || !nik || !nohp || !kodepoli || !norm || !tanggalperiksa || !kodedokter || !jampraktek || !jeniskunjungan || !nomorreferensi) {
                return res.status(400).json({ message: 'nomorkartu, nik, nohp, kodepoli, norm, tanggalperiksa, kodedokter, jampraktek, jeniskunjungan, nomorreferensi harus diisi' });
            }
            if (nomorkartu.length !== 13) {
                return res.status(201).json({ message: 'Nomor Kartu harus 13 digit' });
            }
            if (nik.length !== 16) {
                return res.status(201).json({ message: 'NIK harus 16 digit' });
            }
            let referensiCount = await getCountNomorReferensi(nomorreferensi);
            if (referensiCount[0].total > 0) {
                return res.status(201).json({ message: 'Anda sudah terdaftar dalam antrian menggunakan nomor referensi yang sama' });
            }



            //convert tanggalperiksa to hari
            let hari = convertDay(tanggalperiksa);
            let kdpoli, kddokter, kouta, data;
            kdpoli = await getKdPoli(kodepoli);
            kddokter = await getKdDokter(kodedokter);
            if (kdpoli.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Kode Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            if (kddokter.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Kode Dokter ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            jadwal = await getKouta(kddokter[0].kd_dokter, hari, jampraktek);
            if (jadwal.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Pendaftaran ke Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            let CekPasien = await getCekPasien(nik, nomorkartu);
            if (CekPasien.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Data pasien ini tidak ditemukan, silahkan melakukan registrasi pasien baru ke loket administrasi Kami',
                            'code': 201
                        }
                    }
                );
            }
            let sudahdaftar = await getSudahdaftar(kdpoli[0].kd_poli_rs, kddokter[0].kd_dokter, tanggalperiksa, nomorkartu);
            if (sudahdaftar[0].total > 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Anda sudah terdaftar dalam antrian',
                            'code': 201
                        }
                    }
                );
            }

            // Tanggal awal
            const tanggalAwal = new Date(tanggalperiksa);
            // Tanggal akhir
            const tanggalAkhir = new Date();
            // Menghitung selisih dalam milisekon
            const selisihMilisekon = tanggalAwal - tanggalAkhir;
            // Mengubah selisih milisekon ke hari
            const selisihHari = selisihMilisekon / (1000 * 60 * 60 * 24);
            // 2023-01-27
            // "07:30-10:00",

            if (selisihHari < 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Pendaftaran ke Poli ini sudah tutup',
                            'code': 201
                        }
                    }
                );
            }
            let sisakuota = await getSisaKuota(kdpoli[0].kd_poli_rs, kddokter[0].kd_dokter, tanggalperiksa);

            if (sisakuota[0].total < jadwal[0].kuota) {

                let datapeserta = await getCekPasien(nik, nomorkartu);
                let noReg = await noRegPoli(kdpoli[0].kd_poli_rs, kddokter[0].kd_dokter, tanggalperiksa);
                let max = await maxRegPoli(tanggalperiksa);
                let no_rawat = tanggalperiksa.replace(/-/g, '/') + "/" + max[0].total.toString().padStart(6, '0');
                let maxBokings = await maxBoking(tanggalperiksa);
                let nobooking = tanggalperiksa.replace(/-/g, '') + maxBokings[0].total.toString().padStart(6, '0');
                let statuspoli = await statusPoli(datapeserta[0].no_rkm_medis, kdpoli[0].kd_poli_rs);
                let dilayani = noReg[0].total * 10;
                let statusdaftar = datapeserta[0].tgl_daftar == tanggalperiksa ? "1" : "0";

                let kunjungan = "1 (Rujukan FKTP)";
                if (jeniskunjungan == "1") {
                    kunjungan = "1 (Rujukan FKTP)";
                } else if (jeniskunjungan == "2") {
                    kunjungan = "2 (Rujukan Internal)";
                } else if (jeniskunjungan == "3") {
                    kunjungan = "3 (Kontrol)";
                } else if (jeniskunjungan == "4") {
                    kunjungan = "4 (Rujukan Antar RS)";
                }
                // 
                // insert into reg_periksa values('$noReg', '$no_rawat', '$decode[tanggalperiksa]',current_time(), '$kddokter', '$datapeserta[no_rkm_medis]', '$kdpoli', '$datapeserta[namakeluarga]', '$datapeserta[alamatpj], $datapeserta[kelurahanpj], $datapeserta[kecamatanpj], $datapeserta[kabupatenpj], $datapeserta[propinsipj]', '$datapeserta[keluarga]', '".getOne2("select registrasilama from poliklinik where kd_poli='$kdpoli'")."', 'Belum','".str_replace("0","Lama",str_replace("1","Baru",$statusdaftar))."','Ralan', '".CARABAYAR."', '$umur','$sttsumur','Belum Bayar', '$statuspoli')")
                let jamMulai = await getJadwal(kddokter[0].kd_dokter, hari, jampraktek);
                let datetimejamMulai = new Date(`${tanggalperiksa} ${jamMulai[0].jam_mulai}`);
                datetimejamMulai.setMinutes(datetimejamMulai.getMinutes() + dilayani);
                const estimasidilayani = datetimejamMulai.getTime();

                let reqBoking = {
                    nobooking: nobooking,
                    no_rawat: no_rawat,
                    nomorkartu: nomorkartu,
                    nik: nik,
                    nohp: nohp,
                    kodepoli: kodepoli,
                    pasienbaru: statusdaftar,
                    norm: datapeserta[0].no_rkm_medis,
                    tanggalperiksa: tanggalperiksa,
                    kodedokter: kodedokter,
                    jampraktek: jampraktek,
                    jeniskunjungan: kunjungan,
                    nomorreferensi: nomorreferensi,
                    nomorantrean: kdpoli[0].kd_poli_rs + "-" + noReg[0].total.toString().padStart(3, '0'),
                    angkaantrean: noReg[0].total.toString().padStart(3, '0'),
                    estimasidilayani: estimasidilayani,
                    sisakuotajkn: jadwal[0].kuota - sisakuota[0].total - 1,
                    kuotajkn: jadwal[0].kuota,
                    sisakuotanonjkn: jadwal[0].kuota - sisakuota[0].total - 1,
                    kuotanonjkn: jadwal[0].kuota,
                    status: "Belum",
                    validasi: "0000-00-00 00:00:00",
                    statuskirim: "Belum"
                }

                let current_time = new Date();
                let biayaPoliklinik = await getPoliklinik(kdpoli[0].kd_poli_rs);
                current_time = current_time.getHours() + ":" + current_time.getMinutes() + ":" + current_time.getSeconds();
                let sst_daftar = statusdaftar == 0 ? "Lama" : "Baru";
                let umur, sttsumur;
                if (datapeserta[0].tahun > 0) {
                    umur = datapeserta[0].tahun;
                    sttsumur = "Th";
                } else if (datapeserta[0].tahun == 0) {
                    if (datapeserta[0].bulan > 0) {
                        umur = datapeserta[0].bulan;
                        sttsumur = "Bl";
                    } else if (datapeserta[0].bulan == 0) {
                        umur = datapeserta[0].hari;
                        sttsumur = "Hr";
                    }
                }
                let priksa = {
                    no_reg: noReg[0].total.toString().padStart(3, '0'),
                    no_rawat: no_rawat,
                    tgl_registrasi: tanggalperiksa,
                    jam_reg: jamMulai[0].jam_mulai,
                    kd_dokter: kddokter[0].kd_dokter,
                    no_rkm_medis: datapeserta[0].no_rkm_medis,
                    kd_poli: kdpoli[0].kd_poli_rs,
                    p_jawab: datapeserta[0].namakeluarga,
                    almt_pj: datapeserta[0].alamatpj,
                    hubunganpj: datapeserta[0].keluarga,
                    biaya_reg: biayaPoliklinik[0].registrasilama,
                    stts: "Belum",
                    stts_daftar: sst_daftar,
                    status_lanjut: "Ralan",
                    kd_pj: "BPJ",
                    umurdaftar: umur,
                    sttsumur: sttsumur,
                    status_bayar: "Belum Bayar",
                    status_poli: statuspoli[0].status_pendaftaran,
                }

                let querybooking = await bookingmobilejkn(reqBoking);
                let RegPeriksa = await bookRegPeriksa(priksa);
                return res.status(200).json(
                    {

                        'response': {
                            'nomorantrean': kdpoli[0].kd_poli_rs + "-" + noReg[0].total.toString().padStart(3, '0'),
                            'angkaantrean': noReg[0].total.toString().padStart(3, '0'),
                            'kodebooking': nobooking,
                            'pasienbaru': 0,
                            'norm': datapeserta[0].no_rkm_medis,
                            'namapoli': biayaPoliklinik[0].nm_poli,
                            'namadokter': kddokter[0].nm_dokter_bpjs,
                            'estimasidilayani': estimasidilayani,
                            'sisakuotajkn': jadwal[0].kuota - sisakuota[0].total - 1,
                            'kuotajkn': jadwal[0].kuota,
                            'sisakuotanonjkn': jadwal[0].kuota - sisakuota[0].total - 1,
                            'kuotanonjkn': jadwal[0].kuota,
                            'keterangan': 'Peserta harap 30 menit lebih awal guna pencatatan administrasi.'
                        },
                        "metadata": {
                            "message": "Ok",
                            "code": 200
                        }
                    }
                );

            } else {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Kuota Pendaftaran ke Poli ini sudah penuh',
                            'code': 201
                        }
                    }
                );
            }



        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: 'server Error' });
        }

    },
    checkinantrean: async (req, res) => {
        let { kodebooking, waktu } = req.body;
        if (!kodebooking || !waktu) {
            return res.status(201).json({ message: 'kodebooking dan waktu harus diisi' });
        }
        let booking = await getBooking(kodebooking);
        if (booking.length === 0) {
            return res.status(201).json({
                message: 'kodebooking tidak ditemukan',
                code: 201
            });
        }
        if (booking[0].status == 'Batal') {
            return res.status(201).json({
                message: 'kodebooking sudah dibatalkan',
                code: 201
            });
        }
        if (booking[0].status == 'Checkin') {
            return res.status(201).json({
                message: 'kodebooking sudah checkin',
                code: 201
            });
        }

        if (booking[0].status == 'Belum') {
            let data = await findReg(booking[0].no_rawat);
            if (data.length === 0) {
                return res.status(201).json({
                    message: 'Regis Perikasa tidak ditemukan',
                    code: 201
                });
            }

            let jam_mulai = booking[0].jampraktek.substring(0, 5);
            let jam_akir = booking[0].jampraktek.substring(6, 11);
            let getTgl_periksa = new Date(booking[0].tanggalperiksa); // Membuat objek Date dari string
            // Tambah 1 hari ke tanggal awal
            getTgl_periksa.setDate(getTgl_periksa.getDate() + 1);

            // Format tanggal ke dalam bentuk string 'YYYY-MM-DD'
            let tgl_periksa = getTgl_periksa.toISOString().split('T')[0];

            // Menggabungkan tanggal dan waktu dalam format yang sesuai
            let datetimeAwal = `${tgl_periksa} ${jam_mulai}`;
            let datetimeAkhir = `${tgl_periksa} ${jam_akir}`;
            if (moment().isBefore(datetimeAwal, 'YYYY-MM-DD HH:mm')) {
                return res.status(201).json({
                    "metadata": {
                        "code": 201,
                        "message": "Chekin Anda belum waktunya silahakn cek in pada jam " + datetimeAwal + " - " + jam_akir
                    }
                });
            }
            if (moment().isBetween(datetimeAwal, datetimeAkhir, undefined, '[]')) {
                let resuly = await updateCekin(kodebooking);
                console.log(kodebooking)
                console.log(resuly);
                return res.status(200).json({
                    "metadata": {
                        "code": 200,
                        "message": "OK"
                    }
                });
            }
            return res.status(201).json({
                "metadata": {
                    "code": 201,
                    "message": "Chekin Anda sudah expired. Silahkan konfirmasi ke loket pendaftaran"
                }
            });
        }
    },
    sisaantrean: async (req, res) => {
        let { kodebooking } = req.body;
        if (!kodebooking) {
            return res.status(201).json({ message: 'kodebooking harus diisi' });
        }
        let booking = await getBooking(kodebooking);
        if (booking.length === 0) {
            return res.status(201).json({
                message: 'kodebooking tidak ditemukan',
                code: 201
            });
        }
        if (booking[0].status == 'Batal') {
            return res.status(201).json({
                message: 'kodebooking sudah dibatalkan',
                code: 201
            });
        }
        if (booking[0].status == 'Belum') {
            return res.status(201).json({
                message: 'Anda belum melakukan checkin, Silahkan checkin terlebih dahulu',
                code: 201
            });
        }
        if (booking[0].status == 'Checkin') {
            // $kodedokter = getOne2("select kd_dokter from maping_dokter_dpjpvclaim where kd_dokter_bpjs='$booking[kodedokter]'");
            // $kodepoli   = getOne2("select kd_poli_rs from maping_poli_bpjs where kd_poli_bpjs='$booking[kodepoli]'");
            // $noreg      = getOne2("select no_reg from reg_periksa where no_rawat='$booking[no_rawat]'");
            // $data = fetch_array(bukaquery("SELECT reg_periksa.kd_poli,poliklinik.nm_poli,dokter.nm_dokter,
            //     reg_periksa.no_reg,COUNT(reg_periksa.no_rawat) as total_antrean,
            //     IFNULL(SUM(CASE WHEN reg_periksa.stts ='Belum' THEN 1 ELSE 0 END),0) as sisa_antrean
            //     FROM reg_periksa INNER JOIN poliklinik ON poliklinik.kd_poli=reg_periksa.kd_poli
            //     INNER JOIN dokter ON dokter.kd_dokter=reg_periksa.kd_dokter
            //     WHERE reg_periksa.kd_dokter='$kodedokter' and reg_periksa.kd_poli='$kodepoli'and reg_periksa.tgl_registrasi='$booking[tanggalperiksa]' 
            //     and CONVERT(RIGHT(reg_periksa.no_reg,3),signed)<CONVERT(RIGHT($noreg,3),signed)"));
            let kodedokter = await getKdDokter(booking[0].kodedokter);
            let kodepoli = await getKdPoli(booking[0].kodepoli);
            let namaPoli = await getNamaPoli(kodepoli[0].kd_poli_rs);
            let noreg = await getRegis(booking[0].no_rawat);
            let getTgl_periksa = new Date(booking[0].tanggalperiksa); // Membuat objek Date dari string
            // Tambah 1 hari ke tanggal awal
            getTgl_periksa.setDate(getTgl_periksa.getDate() + 1);

            // Format tanggal ke dalam bentuk string 'YYYY-MM-DD'
            let tgl_periksa = getTgl_periksa.toISOString().split('T')[0];
            let totals = await getRegisStt(kodedokter[0].kd_dokter, kodepoli[0].kd_poli_rs, tgl_periksa, "Belum");

            return res.status(201).json({
                "response": {
                    "nomorantrean": kodepoli[0].kd_poli_rs + "-" + noreg[0].no_reg,
                    "namapoli": namaPoli[0].nm_poli,
                    "namadokter": kodedokter[0].nm_dokter_bpjs,
                    "sisaantrean": totals.length,
                    "antreanpanggil": "",
                    "waktutunggu": 0,
                    "keterangan": ""
                },
                "metadata": {
                    "message": "Ok",
                    "code": 200
                }
            });
        }
    },
    batalantrean: async (req, res) => {
        const { kodebooking, keterangan } = req.body;
        if (!kodebooking || !keterangan) {
            return res.status(201).json({ message: 'kodebooking dan keterangan harus diisi' });
        }
        let booking = await getBooking(kodebooking);
        if (booking.length === 0) {
            return res.status(201).json({
                message: 'kodebooking tidak ditemukan',
                code: 201
            });
        }
        if (booking[0].status == 'Batal') {
            return res.status(201).json({
                message: 'kodebooking sudah dibatalkan',
                code: 201
            });
        }
        if (booking[0].status == 'Checkin') {
            return res.status(201).json({
                message: 'kodebooking sudah checkin',
                code: 201
            });
        }

        let conn, data;
        try {
            conn = await pool.getConnection();
            data = await conn.query(`UPDATE referensi_mobilejkn_bpjs SET status='Batal',validasi=now() WHERE nobooking='${kodebooking}'`);
        } finally {
            if (conn) conn.release(); //release to pool
        }
        return res.status(201).json({
            message: 'Ok',
            code: 200
        });

    }
};
