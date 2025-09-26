/**
 * Bản đồ mapbox
 */
class BảnĐồ {

    static kiểu_bản_đồ_tiêu_chuẩn = {
        mặc_định: "standard",
        vệ_tinh: "standard-satellite",
        đường_phố: "streets-v11"
    }
    #bản_đồ;
    /**
     * @param {string} bộ_chứa tên class hoặc id của html
     * @param {BảnĐồ.kiểu_bản_đồ_tiêu_chuẩn} kiểu_bản_đồ_tiêu_chuẩn là tên kiểu bản đồ tiêu chuẩn
     * @param {number[]} tọa_độ_trung_tâm nhận đối số là mảng gồm lần lượt hoành độ, tung độ
     * @param {number} độ_thu_phóng nhận mức số là mức độ zoom, min: , max: 
     */
    constructor(mapbox_token, bộ_chứa, kiểu_bản_đồ_tiêu_chuẩn, tọa_độ_trung_tâm, độ_thu_phóng) {
        this.#bản_đồ = new mapboxgl.Map({
            container: bộ_chứa,
            style: 'mapbox://styles/mapbox/' + kiểu_bản_đồ_tiêu_chuẩn, // Use the standard style for the map
            projection: 'globe', // display the map as a globe
            zoom: độ_thu_phóng, // initial zoom level, 0 is the world view, higher values zoom in
            center: tọa_độ_trung_tâm, // center the map on this longitude and latitude
            accessToken: mapbox_token,
        })
        this.#bản_đồ.addControl(new mapboxgl.NavigationControl());


        this.#bản_đồ.on('style.load', () => {
            this.#bản_đồ.setFog({
                "range": [0.5, 10],
                "color": "white",
                "horizon-blend": 0.01,
                "high-color": "blue",
                "space-color": "#000000",
                "star-intensity": 1
            });

        });


    }

    /**
     * 
     * @param {BảnĐồ.kiểu_bản_đồ_tiêu_chuẩn} kiểu_bản_đồ_tiêu_chuẩn tên kiểu bản đồ tiêu chuẩn
     */
    ĐổiKiểuBảnĐồTiêuChuẩn(kiểu_bản_đồ_tiêu_chuẩn) {
        this.#bản_đồ.setStyle('mapbox://styles/mapbox/' + kiểu_bản_đồ_tiêu_chuẩn);
    }

    /**
     * @param {MapboxDraw} bộ_vẽ
     * @param {boolean} được_phép_hiện 
     */
    CàiHiểnThịBộVẽKhôngGianĐịaLý(bộ_vẽ, được_phép_hiện = true) {
        if (được_phép_hiện == true) {
            this.#bản_đồ.addControl(bộ_vẽ, "top-left");

        }
        else {
            if (this.#bản_đồ.hasControl?.(bộ_vẽ)) {
                this.#bản_đồ.removeControl(bộ_vẽ);
            }
        }
    }
}
