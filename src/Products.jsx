import ProductCard from "./ProductCard";

function Products(){
    return(
    <div>
        <br/>
        <p style={{ fontFamily: "Verdana", color: "white"}}>Наши продукты:</p>
        <br/>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "20px" }}>
            <ProductCard name="Лонгслив Suarez" price="7500" img="https://basket-32.wbbasket.ru/vol6724/part672443/672443552/images/c516x688/1.webp"/>
            <ProductCard name="Лонгслив Shevchenko" price="5000" img="https://basket-45.wbbasket.ru/vol12818/part1281809/1281809492/images/c516x688/1.webp"/>
            <ProductCard name="Футболка F.Torres" price="3000" img="https://basket-48.wbbasket.ru/vol15074/part1507430/1507430874/images/c516x688/1.webp"/>
            <ProductCard name="Лонгслив L.Yamal" price="2000"img="https://basket-37.wbbasket.ru/vol8011/part801171/801171027/images/c516x688/1.webp"/>
            <ProductCard name="Футболка Pogba" price="2500" img="https://i.ebayimg.com/images/g/T98AAeSwY9towRnB/s-l1200.webp"/>
        </div>
    </div>
    ); 
}
export default Products;