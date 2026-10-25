from pydantic import BaseModel
from typing import List, Optional


class Disponibilidad(BaseModel):
    """
    Representa la disponibilidad de asientos para una función en un cine.
    """
    asientos_disponibles: int
    capacidad: int
    estado: str


class Funcion(BaseModel):
    """
    Representa una función (horario) específica de una película en una sede.
    """
    dia: str = ""
    hora: str
    formato: str
    idioma: str = ""
    sala: Optional[str] = None
    precio: Optional[float] = None
    disponibilidad: Optional[Disponibilidad] = None


class Sede(BaseModel):
    """
    Agrupa todas las funciones de una película que se emiten en un cine o sede particular.
    """
    nombre: str
    ciudad: str
    dias: List[str]
    funciones: List[Funcion]


class Pelicula(BaseModel):
    """
    Modelo principal que representa una película en cartelera, con todos sus detalles 
    y las funciones disponibles agrupadas por sede.
    """
    cadena: str = ""
    titulo: str
    url: str
    genero: str
    idiomas: List[str]
    formatos: List[str]
    ciudades: List[str]
    sedes: List[Sede]
    poster_url: Optional[str] = None
    duracion: Optional[int] = None
    censura: Optional[str] = None
    sinopsis: Optional[str] = None
    nominaciones: Optional[str] = None
