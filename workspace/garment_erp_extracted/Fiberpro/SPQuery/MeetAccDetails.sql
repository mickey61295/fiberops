/*    
;=============================================    
; Author           :  Global Software's    
; Create date      :  20/08/2015    
; Create By        :  Karthick.M  
; Description      :  MeetAccDetails  
; Change Person    :  S.Nasima
; Last Change Date :  31/01/2018 11.20 AM
; =============================================  */  
    
   
CREATE PROC [dbo].[MeetAccDetails] (@Ordid NVarchar(MAX),@Style VARCHAR(100),@Type VARCHAR(10))  
AS  
 BEGIN  
 SET NOCOUNT ON;  
  IF @Type='1'  
   BEGIN  
    select Style,  
      Item,  
      Descs,  
      Color,  
      Size,  
      FLOOR(SUM(Req_Qty))as Req_Qty,  
      FLOOR(SUM(ShortQty))as ShortQty,  
      FLOOR(SUM(Po_Qty))as Po_Qty,  
      (0)AS Po_Pen,  
      FLOOR(SUM(Grn_Qty))Grn_Qty,  
      (0) AS Grn_Pen,   
                        FLOOR(SUM(Dc_Qty))as Dc_Qty,  
      FLOOR(SUM(Dc_Ret))as Dc_Ret,  
      FLOOR(SUM(Grn_Ret))as Grn_Ret,  
      FLOOR(SUM(Stock))as Stock,  
      FLOOR(SUM(Trs_Out))as Trs_Out,  
      FLOOR(SUM(Trs_In))as Trs_In,  
      0 AS Trans,  
      FLOOR(SUM(Po_Can))as Po_Can from (  
          SELECT Coycode,  
       Z.OrdID,  
       Z.styleno,  
       (Z.styleno)as Style,  
       SUBSTRING((Mas_Acc.Acc_Descr),1,30)as Item,   
       AType,  
       SUBSTRING((Mas_AccDes.AccDescription),1,20)as Descs,  
       ADes,  
       SUBSTRING((Mas_Color.ColorDesc),1,15)as Color,  
       ACol,  
       (Mas_Size.SizeDesc)as Size,  
       Asize,  
       FLOOR(SUM(ReqQty))as Req_Qty,  
       FLOOR(SUM(ShortQty))as ShortQty,  
       FLOOR(SUM(POQty))as Po_Qty,  
       (0)AS Po_Pen,  
       FLOOR(SUM(RecQty))Grn_Qty,  
       (0) AS Grn_Pen,    
       FLOOR(SUM(DelQty))as Dc_Qty,  
       FLOOR(SUM(Del_Ret))as Dc_Ret,  
       FLOOR(SUM(retqty))as Grn_Ret,  
       FLOOR(SUM(StockQty))as Stock,  
       FLOOR(SUM(TranOutKgs))as Trs_Out,  
       FLOOR(SUM(TranInKgs))as Trs_In,0 AS Trans,  
       FLOOR(SUM(PoCanQty))as Po_Can    
       from(  
        (SELECT OrderMas.ExpID AS Coycode,   
        PRO_AccReq.OrdID,   
        isnull(PRO_AccReq.styleno,'') as styleno,    
        PRO_AccReq.Acc_Type AS AType,   
        PRO_AccReq.Acc_Desc AS ADes,   
        PRO_AccReq.Clr AS ACol,  
        PRO_AccReq.Siz AS ASize,   
        SUM(PRO_AccReq.ReqdQty) AS ReqQty,  
        0 AS ShortQty, 0 AS POQty,   
        0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,   
        0 AS retqty, 0 AS StockQty,    
        0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty   
        FROM PRO_AccReq    
           INNER JOIN OrderMas ON PRO_AccReq.OrdID = OrderMas.OrdId    
             and PRO_AccReq.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
               
        GROUP BY OrderMas.ExpID, PRO_AccReq.OrdID, PRO_AccReq.Acc_Type, PRO_AccReq.Acc_Desc,    
           PRO_AccReq.Clr, PRO_AccReq.Siz, isnull(PRO_AccReq.styleno,''))  
  
        UNION ALL    
  
           (SELECT OrderMas.ExpID AS Coycode, Trs_Shortage.OrdID,   
           isnull(Trs_Shortage.styleno,'') as styleno,    
           Trs_Shortage.atype AS AType, Trs_Shortage.ades AS ADes,   
           Trs_Shortage.ColID AS ACol,    
           Trs_Shortage.asiz AS ASize,0 AS ReqQty,   
           SUM(Trs_Shortage.ShortKgs) AS ShortQty,   
           0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,  
           0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Shortage   
           INNER JOIN OrderMas ON Trs_Shortage.OrdID = OrderMas.OrdId    
           and Trs_Shortage.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
              
           where Trs_Shortage.Dept=0    
           GROUP BY OrderMas.ExpID, Trs_Shortage.OrdID,   
           Trs_Shortage.atype, Trs_Shortage.ades, Trs_Shortage.ColID,    
           Trs_Shortage.asiz,Trs_Shortage.ColID,   
           Trs_Shortage.asiz, isnull(Trs_Shortage.styleno,''))    
  
        UNION ALL    
           (SELECT Trs_Po1.Coycode,   
           Trs_Po5.OrdID,   
           isnull(Trs_Po5.styleno,'') as styleno,   
           Trs_Po5.AType,    
           Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz, 0 AS ReqQty,0 AS ShortQty,              SUM(Trs_Po5.PoQty) AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,  
           0 AS retqty, 0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs,  
           0 as PoCanQty FROM Trs_Po1    
           INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
            and Trs_Po5.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
              
           GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID, Trs_Po5.AType,  
           Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  isnull(Trs_Po5.styleno,''))    
        UNION ALL    
           (SELECT Trs_Grn1.Coycode,   
           Trs_GRN2.ordid, isnull(Trs_GRN2.styleno,'') as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
           0 AS ReqQty,0 AS ShortQty,    
           0 AS POQty, SUM(Trs_GRN2.RecKgs) AS RecQty, 0 AS DelQty,  
           0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
           INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID    
           INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
           WHERE (StockTable.YF = 'A')    
              and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
                 
           GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'')   
           as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
           0 AS ReqQty,0 AS ShortQty, 0 AS POQty, 0 AS RecQty, 0 AS delqty,  
           0 AS Del_Ret,   
           SUM(Trs_Del2.Kg) AS retqty, 0 AS StockQty, 0 as TranOutKgs,    
           0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
           INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
           INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
           WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType = 6)    
            and Trs_Del2.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
               
           GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
           StockTable.Ades, StockTable.ColID,    
           StockTable.Siz, isnull(Trs_Del2.styleno,''))   
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'')  
            as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
           0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
           0 AS RecQty, SUM(Trs_Del2.Kg) AS DelQty,0 AS Del_Ret, 0 AS retqty,   
           0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1    
           INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
           INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
             and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
              
           WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType not in (6,8))   
           GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
           StockTable.Ades, StockTable.ColID, StockTable.Siz,    
           isnull(Trs_Del2.styleno,''))    
        UNION ALL    
           (SELECT Trs_Grn1.Coycode, Trs_GRN2.ordid,   
           isnull(Trs_GRN2.styleno,'') as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID,   
           StockTable.Siz, 0 AS ReqQty,0 AS ShortQty,   
           0 AS POQty, 0 AS RecQty, 0 AS DelQty,  
           SUM(Trs_GRN2.RecKgs) AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
           INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID   
             and Trs_Grn1.GRNType='Acc.Iss.Ret'    
           INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
           WHERE (StockTable.YF = 'A')    
           and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
             
           GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
        UNION ALL    
           (SELECT StockTable.Coycode, StockTable.OrdID,    
           --isnull(Vue_StockAbs.styleno,'') as styleno,   
           isnull(CurrentStock.styleno,'') as styleno,   
           StockTable.Atype, StockTable.Ades,   
           StockTable.ColID,    
           StockTable.Siz, 0 AS ReqQty, 0 AS POQty, 0 AS RecQty, 0 AS DelQty,  
           0 AS Del_Ret,  
           0 AS retqty,0 AS ShortQty,   
           --SUM(Vue_StockAbs.Kg) AS StockQty
           SUM(CurrentStock.Kg) AS StockQty, 0 as TranOutKgs, 0 as TranInKgs,  
            0 as PoCanQty    
           FROM --Vue_StockAbs    
           CurrentStock
           INNER JOIN StockTable ON Currentstock.StockID = StockTable.StockID    
           WHERE (StockTable.YF = 'A') and StockTable.OrdID   
           in (  SELECT ID FROM fnSplitter(@Ordid))   
           GROUP BY StockTable.Coycode, StockTable.OrdID,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(CurrentStock.styleno,''))   
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID,   
           isnull(Trs_Del2.styleno,'') as styleno,        
           StockTable.Atype, StockTable.Ades, StockTable.ColID,   
           StockTable.Siz, 0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
           0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,   
           0 AS StockQty, SUM(Trs_Del2.Kg) as TranOutKgs,    
           0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
            INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
            INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
            AND Trs_Del2.OrdID = StockTable.OrdID   
            WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
            and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
               
           GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.styleno,''))    
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.TranOrdID,   
           isnull(Trs_Del2.TranStyleNo,'') as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID,   
           StockTable.Siz, 0 AS ReqQty,0 AS   
           ShortQty,    
           0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,   
           0 AS StockQty,    
           0 as TranOutKgs, SUM(Trs_Del2.Kg) as TranInKgs,   
           0 as PoCanQty FROM Trs_Del1    
           INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
           INNER JOIN StockTable ON Trs_Del2.TranID = StockTable.StockID   
           AND Trs_Del2.TranOrdID = StockTable.OrdID    
           WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
           and Trs_Del2.TranOrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
              
           GROUP BY Trs_Del1.Coycode, Trs_Del2.TranOrdID,  
            StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.TranStyleNo,''))    
        UNION ALL    
           (SELECT Trs_Po1.Coycode, Trs_Po5.OrdID, isnull(Trs_Po5.styleno,'')  
            as styleno,    
           Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  
           0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
           0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,  
           0 AS StockQty, 0 as TranOutKgs, 0 as TranInKgs,    
           SUM(Trs_Po5.CancelKgs) as PoCanQty FROM Trs_Po1   
           INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
           and Trs_Po5.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
              
           GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID,   
           Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr,    
           Trs_Po5.Siz, isnull(Trs_Po5.styleno,'')))Z   
        INNER JOIN Mas_Acc ON Z.Atype=Mas_Acc.ID   
        INNER JOIN Mas_AccDes ON Z.ADes=Mas_AccDes.ID    
        LEFT OUTER JOIN Mas_Color ON Z.ACol=Mas_Color.ColID   
        LEFT OUTER JOIN Mas_Size ON Z.Asize=Mas_Size.SizeID    
        LEFT OUTER JOIN OrdSizeMas ON Z.Asize=OrdSizeMas.SizeID   
           and Z.OrdId=OrdSizeMas.OrdId    
       group by Z.Coycode,Z.OrdID,Z.styleno,Mas_Acc.Acc_Descr,Z.Atype,Mas_AccDes.AccDescription,  
       Z.ADes,Mas_Color.ColorDesc,Z.ACol,Mas_Size.SizeDesc,Z.Asize,OrdSizeMas.SNo  
       )X group by X.Style,X.Item,X.Descs,X.Color,X.Size Order by style,Item,Descs,X.Color  
   END  
  IF @Type='2'  
   BEGIN  
    SELECT Coycode,  
     Z.OrdID,  
     Z.styleno,  
     (Z.styleno)as Style,  
     SUBSTRING((Mas_Acc.Acc_Descr),1,30)as Item,   
     AType,  
     SUBSTRING((Mas_AccDes.AccDescription),1,20)as Descs,  
     ADes,  
     SUBSTRING((Mas_Color.ColorDesc),1,15)as Color,  
     ACol,  
     (Mas_Size.SizeDesc)as Size,  
     Asize,  
     FLOOR(SUM(ReqQty))as Req_Qty,  
     FLOOR(SUM(ShortQty))as ShortQty,  
     FLOOR(SUM(POQty))as Po_Qty,  
     (0)AS Po_Pen,  
     FLOOR(SUM(RecQty))Grn_Qty,  
     (0) AS Grn_Pen,    
     FLOOR(SUM(DelQty))as Dc_Qty,  
     FLOOR(SUM(Del_Ret))as Dc_Ret,  
     FLOOR(SUM(retqty))as Grn_Ret,  
     FLOOR(SUM(StockQty))as Stock,  
     FLOOR(SUM(TranOutKgs))as Trs_Out,  
     FLOOR(SUM(TranInKgs))as Trs_In,0 AS Trans,  
     FLOOR(SUM(PoCanQty))as Po_Can    
     from(  
      (SELECT OrderMas.ExpID AS Coycode,   
      PRO_AccReq.OrdID,   
      isnull(PRO_AccReq.styleno,'') as styleno,    
      PRO_AccReq.Acc_Type AS AType,   
      PRO_AccReq.Acc_Desc AS ADes,   
      PRO_AccReq.Clr AS ACol,  
      PRO_AccReq.Siz AS ASize,   
      SUM(PRO_AccReq.ReqdQty) AS ReqQty,  
      0 AS ShortQty, 0 AS POQty,   
      0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,   
      0 AS retqty, 0 AS StockQty,    
      0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty   
      FROM PRO_AccReq    
         INNER JOIN OrderMas ON PRO_AccReq.OrdID = OrderMas.OrdId    
           and PRO_AccReq.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
      GROUP BY OrderMas.ExpID, PRO_AccReq.OrdID, PRO_AccReq.Acc_Type, PRO_AccReq.Acc_Desc,    
         PRO_AccReq.Clr, PRO_AccReq.Siz, isnull(PRO_AccReq.styleno,''))  
  
      UNION ALL    
  
         (SELECT OrderMas.ExpID AS Coycode, Trs_Shortage.OrdID,   
         isnull(Trs_Shortage.styleno,'') as styleno,    
         Trs_Shortage.atype AS AType, Trs_Shortage.ades AS ADes,   
         Trs_Shortage.ColID AS ACol,    
         Trs_Shortage.asiz AS ASize,0 AS ReqQty, SUM(Trs_Shortage.ShortKgs) AS ShortQty,   
         0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Shortage   
         INNER JOIN OrderMas ON Trs_Shortage.OrdID = OrderMas.OrdId    
         and Trs_Shortage.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
            
         where Trs_Shortage.Dept=0    
         GROUP BY OrderMas.ExpID, Trs_Shortage.OrdID,   
         Trs_Shortage.atype, Trs_Shortage.ades, Trs_Shortage.ColID,    
         Trs_Shortage.asiz,Trs_Shortage.ColID,   
         Trs_Shortage.asiz, isnull(Trs_Shortage.styleno,''))    
  
      UNION ALL    
         (SELECT Trs_Po1.Coycode,   
         Trs_Po5.OrdID,   
         isnull(Trs_Po5.styleno,'') as styleno,   
         Trs_Po5.AType,    
         Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz, 0 AS ReqQty,0 AS ShortQty,   
         SUM(Trs_Po5.PoQty) AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,  
         0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs,  
         0 as PoCanQty FROM Trs_Po1    
         INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
          and Trs_Po5.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
             
         GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID, Trs_Po5.AType,  
         Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  isnull(Trs_Po5.styleno,''))    
      UNION ALL    
         (SELECT Trs_Grn1.Coycode,   
         Trs_GRN2.ordid, isnull(Trs_GRN2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
         0 AS ReqQty,0 AS ShortQty,    
         0 AS POQty, SUM(Trs_GRN2.RecKgs) AS RecQty, 0 AS DelQty,  
         0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
         INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID    
         INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
         WHERE (StockTable.YF = 'A')    
            and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
               
         GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
         0 AS ReqQty,0 AS ShortQty, 0 AS POQty, 0 AS RecQty, 0 AS delqty,0 AS Del_Ret,   
         SUM(Trs_Del2.Kg) AS retqty, 0 AS StockQty, 0 as TranOutKgs,    
         0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
         INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
         INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
         WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType = 6)    
          and Trs_Del2.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
           
         GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
         StockTable.Ades, StockTable.ColID,    
         StockTable.Siz, isnull(Trs_Del2.styleno,''))   
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
         0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
         0 AS RecQty, SUM(Trs_Del2.Kg) AS DelQty,0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1    
         INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
         INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
           and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
             
         WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType not in (6,8))   
         GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
         StockTable.Ades, StockTable.ColID, StockTable.Siz,    
         isnull(Trs_Del2.styleno,''))    
      UNION ALL    
         (SELECT Trs_Grn1.Coycode, Trs_GRN2.ordid,   
         isnull(Trs_GRN2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID,   
         StockTable.Siz, 0 AS ReqQty,0 AS ShortQty,   
         0 AS POQty, 0 AS RecQty, 0 AS DelQty,  
         SUM(Trs_GRN2.RecKgs) AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
         INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID   
           and Trs_Grn1.GRNType='Acc.Iss.Ret'    
         INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
         WHERE (StockTable.YF = 'A')    
         and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
            
         GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
      UNION ALL    
         (SELECT StockTable.Coycode, StockTable.OrdID,    
         --isnull(Vue_StockAbs.styleno,'') as styleno, 
         isnull(CurrentStock.styleno,'') as styleno, 
         StockTable.Atype, StockTable.Ades,   
         StockTable.ColID,    
         StockTable.Siz, 0 AS ReqQty, 0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,  
         0 AS retqty,0 AS ShortQty,   
         SUM(CurrentStock.Kg) AS StockQty, 0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty    
         FROM --Vue_StockAbs   
         CurrentStock
         INNER JOIN StockTable ON CurrentStock.StockID = StockTable.StockID    
         WHERE (StockTable.YF = 'A') and StockTable.OrdID   
         in (  SELECT ID FROM fnSplitter(@Ordid))   
              
         GROUP BY StockTable.Coycode, StockTable.OrdID, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(CurrentStock.styleno,''))   
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID,   
         isnull(Trs_Del2.styleno,'') as styleno,        
         StockTable.Atype, StockTable.Ades, StockTable.ColID,   
         StockTable.Siz, 0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
         0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,   
         0 AS StockQty, SUM(Trs_Del2.Kg) as TranOutKgs,    
         0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
          INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
          INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
          AND Trs_Del2.OrdID = StockTable.OrdID   
          WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
          and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
            
         GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.styleno,''))    
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.TranOrdID,   
         isnull(Trs_Del2.TranStyleNo,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID,   
         StockTable.Siz, 0 AS ReqQty,0 AS   
         ShortQty,    
         0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, SUM(Trs_Del2.Kg) as TranInKgs, 0 as PoCanQty FROM Trs_Del1    
         INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
         INNER JOIN StockTable ON Trs_Del2.TranID = StockTable.StockID   
         AND Trs_Del2.TranOrdID = StockTable.OrdID    
         WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
         and Trs_Del2.TranOrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
            
         GROUP BY Trs_Del1.Coycode, Trs_Del2.TranOrdID, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.TranStyleNo,''))    
      UNION ALL    
         (SELECT Trs_Po1.Coycode, Trs_Po5.OrdID, isnull(Trs_Po5.styleno,'') as styleno,    
         Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  
         0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
         0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,  
         0 AS StockQty, 0 as TranOutKgs, 0 as TranInKgs,    
         SUM(Trs_Po5.CancelKgs) as PoCanQty FROM Trs_Po1   
         INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
         and Trs_Po5.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
           
         GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID,   
         Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr,    
         Trs_Po5.Siz, isnull(Trs_Po5.styleno,'')))Z   
      INNER JOIN Mas_Acc ON Z.Atype=Mas_Acc.ID   
      INNER JOIN Mas_AccDes ON Z.ADes=Mas_AccDes.ID    
      LEFT OUTER JOIN Mas_Color ON Z.ACol=Mas_Color.ColID   
      LEFT OUTER JOIN Mas_Size ON Z.Asize=Mas_Size.SizeID    
      LEFT OUTER JOIN OrdSizeMas ON Z.Asize=OrdSizeMas.SizeID   
         and Z.OrdId=OrdSizeMas.OrdId    
     group by Z.Coycode,Z.OrdID,Z.styleno,Mas_Acc.Acc_Descr,Z.Atype,Mas_AccDes.AccDescription,  
     Z.ADes,Mas_Color.ColorDesc,Z.ACol,Mas_Size.SizeDesc,Z.Asize,OrdSizeMas.SNo  
     Order by Z.styleno,Item,Descs,Mas_Color.ColorDesc,OrdSizeMas.SNo   
   END  
  IF @Type='3'  
   BEGIN  
    select Style,  
      Item,  
      Descs,  
      Color,  
      Size,  
      FLOOR(SUM(Req_Qty))as Req_Qty,  
      FLOOR(SUM(ShortQty))as ShortQty,  
      FLOOR(SUM(Po_Qty))as Po_Qty,  
      (0)AS Po_Pen,  
      FLOOR(SUM(Grn_Qty))Grn_Qty,  
      (0) AS Grn_Pen,   
                        FLOOR(SUM(Dc_Qty))as Dc_Qty,  
      FLOOR(SUM(Dc_Ret))as Dc_Ret,  
      FLOOR(SUM(Grn_Ret))as Grn_Ret,  
      FLOOR(SUM(Stock))as Stock,  
      FLOOR(SUM(Trs_Out))as Trs_Out,  
      FLOOR(SUM(Trs_In))as Trs_In,  
      0 AS Trans,  
      FLOOR(SUM(Po_Can))as Po_Can from (  
          SELECT Coycode,  
       Z.OrdID,  
       Z.styleno,  
       (Z.styleno)as Style,  
       SUBSTRING((Mas_Acc.Acc_Descr),1,30)as Item,   
       AType,  
       SUBSTRING((Mas_AccDes.AccDescription),1,20)as Descs,  
       ADes,  
       SUBSTRING((Mas_Color.ColorDesc),1,15)as Color,  
       ACol,  
       (Mas_Size.SizeDesc)as Size,  
       Asize,  
       FLOOR(SUM(ReqQty))as Req_Qty,  
       FLOOR(SUM(ShortQty))as ShortQty,  
       FLOOR(SUM(POQty))as Po_Qty,  
       (0)AS Po_Pen,  
       FLOOR(SUM(RecQty))Grn_Qty,  
       (0) AS Grn_Pen,    
       FLOOR(SUM(DelQty))as Dc_Qty,  
       FLOOR(SUM(Del_Ret))as Dc_Ret,  
       FLOOR(SUM(retqty))as Grn_Ret,  
       FLOOR(SUM(StockQty))as Stock,  
       FLOOR(SUM(TranOutKgs))as Trs_Out,  
       FLOOR(SUM(TranInKgs))as Trs_In,0 AS Trans,  
       FLOOR(SUM(PoCanQty))as Po_Can    
       from(  
        (SELECT OrderMas.ExpID AS Coycode,   
        PRO_AccReq.OrdID,   
        isnull(PRO_AccReq.styleno,'') as styleno,    
        PRO_AccReq.Acc_Type AS AType,   
        PRO_AccReq.Acc_Desc AS ADes,   
        PRO_AccReq.Clr AS ACol,  
        PRO_AccReq.Siz AS ASize,   
        SUM(PRO_AccReq.ReqdQty) AS ReqQty,  
        0 AS ShortQty, 0 AS POQty,   
        0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,   
        0 AS retqty, 0 AS StockQty,    
        0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty   
        FROM PRO_AccReq    
           INNER JOIN OrderMas ON PRO_AccReq.OrdID = OrderMas.OrdId    
             and PRO_AccReq.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
             and PRO_AccReq.StyleNo=@Style   
        GROUP BY OrderMas.ExpID, PRO_AccReq.OrdID, PRO_AccReq.Acc_Type, PRO_AccReq.Acc_Desc,    
           PRO_AccReq.Clr, PRO_AccReq.Siz, isnull(PRO_AccReq.styleno,''))  
  
        UNION ALL    
  
           (SELECT OrderMas.ExpID AS Coycode, Trs_Shortage.OrdID,   
           isnull(Trs_Shortage.styleno,'') as styleno,    
           Trs_Shortage.atype AS AType, Trs_Shortage.ades AS ADes,   
           Trs_Shortage.ColID AS ACol,    
           Trs_Shortage.asiz AS ASize,0 AS ReqQty,   
           SUM(Trs_Shortage.ShortKgs) AS ShortQty,   
           0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,  
           0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Shortage   
           INNER JOIN OrderMas ON Trs_Shortage.OrdID = OrderMas.OrdId    
           and Trs_Shortage.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
           and Trs_Shortage.StyleNo=@Style   
           where Trs_Shortage.Dept=0    
           GROUP BY OrderMas.ExpID, Trs_Shortage.OrdID,   
           Trs_Shortage.atype, Trs_Shortage.ades, Trs_Shortage.ColID,    
           Trs_Shortage.asiz,Trs_Shortage.ColID,   
           Trs_Shortage.asiz, isnull(Trs_Shortage.styleno,''))    
  
        UNION ALL    
           (SELECT Trs_Po1.Coycode,   
           Trs_Po5.OrdID,   
           isnull(Trs_Po5.styleno,'') as styleno,   
           Trs_Po5.AType,    
           Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz, 0 AS ReqQty,0 AS ShortQty,   
           SUM(Trs_Po5.PoQty) AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,  
           0 AS retqty, 0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs,  
           0 as PoCanQty FROM Trs_Po1    
           INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
            and Trs_Po5.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
            and Trs_Po5.StyleNo=@Style   
           GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID, Trs_Po5.AType,  
           Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  isnull(Trs_Po5.styleno,''))    
        UNION ALL    
           (SELECT Trs_Grn1.Coycode,   
           Trs_GRN2.ordid, isnull(Trs_GRN2.styleno,'') as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
           0 AS ReqQty,0 AS ShortQty,    
           0 AS POQty, SUM(Trs_GRN2.RecKgs) AS RecQty, 0 AS DelQty,  
           0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
           INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID    
           INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
           WHERE (StockTable.YF = 'A')    
              and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
              and Trs_GRN2.styleno=@Style   
           GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'')   
           as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
           0 AS ReqQty,0 AS ShortQty, 0 AS POQty, 0 AS RecQty, 0 AS delqty,  
           0 AS Del_Ret,   
           SUM(Trs_Del2.Kg) AS retqty, 0 AS StockQty, 0 as TranOutKgs,    
           0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
           INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
           INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
           WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType = 6)    
            and Trs_Del2.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
            and Trs_Del2.styleno=@Style   
           GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
           StockTable.Ades, StockTable.ColID,    
           StockTable.Siz, isnull(Trs_Del2.styleno,''))   
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'')  
            as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
           0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
           0 AS RecQty, SUM(Trs_Del2.Kg) AS DelQty,0 AS Del_Ret, 0 AS retqty,   
           0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1    
           INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
           INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
             and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
             and Trs_Del2.styleno=@Style  
           WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType not in (6,8))   
           GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
           StockTable.Ades, StockTable.ColID, StockTable.Siz,    
           isnull(Trs_Del2.styleno,''))    
        UNION ALL    
           (SELECT Trs_Grn1.Coycode, Trs_GRN2.ordid,   
           isnull(Trs_GRN2.styleno,'') as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID,   
           StockTable.Siz, 0 AS ReqQty,0 AS ShortQty,   
           0 AS POQty, 0 AS RecQty, 0 AS DelQty,  
           SUM(Trs_GRN2.RecKgs) AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
           0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
           INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID   
             and Trs_Grn1.GRNType='Acc.Iss.Ret'    
           INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
           WHERE (StockTable.YF = 'A')    
           and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
           and Trs_GRN2.styleno=@Style   
           GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
        UNION ALL    
           (SELECT StockTable.Coycode, StockTable.OrdID,    
          -- isnull(Vue_StockAbs.styleno,'') as styleno,   
           isnull(CurrentStock.styleno,'') as styleno,   
           StockTable.Atype, StockTable.Ades,   
           StockTable.ColID,    
           StockTable.Siz, 0 AS ReqQty, 0 AS POQty, 0 AS RecQty, 0 AS DelQty,  
           0 AS Del_Ret,  
           0 AS retqty,0 AS ShortQty,   
           SUM(CurrentStock.Kg) AS StockQty, 0 as TranOutKgs, 0 as TranInKgs,  
            0 as PoCanQty    
           FROM --Vue_StockAbs  
           CurrentStock 
           INNER JOIN StockTable ON CurrentStock.StockID = StockTable.StockID    
           WHERE (StockTable.YF = 'A') and StockTable.OrdID   
           in (  SELECT ID FROM fnSplitter(@Ordid))   
             and CurrentStock.styleno=@Style  
           GROUP BY StockTable.Coycode, StockTable.OrdID,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(CurrentStock.styleno,''))   
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID,   
           isnull(Trs_Del2.styleno,'') as styleno,        
           StockTable.Atype, StockTable.Ades, StockTable.ColID,   
           StockTable.Siz, 0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
           0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,   
           0 AS StockQty, SUM(Trs_Del2.Kg) as TranOutKgs,    
           0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
            INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
            INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
            AND Trs_Del2.OrdID = StockTable.OrdID   
            WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
            and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
            and Trs_Del2.styleno=@Style   
           GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID,   
           StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.styleno,''))    
        UNION ALL    
           (SELECT Trs_Del1.Coycode, Trs_Del2.TranOrdID,   
           isnull(Trs_Del2.TranStyleNo,'') as styleno,    
           StockTable.Atype, StockTable.Ades, StockTable.ColID,   
           StockTable.Siz, 0 AS ReqQty,0 AS   
           ShortQty,    
           0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,   
           0 AS StockQty,    
           0 as TranOutKgs, SUM(Trs_Del2.Kg) as TranInKgs,   
           0 as PoCanQty FROM Trs_Del1    
           INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
           INNER JOIN StockTable ON Trs_Del2.TranID = StockTable.StockID   
           AND Trs_Del2.TranOrdID = StockTable.OrdID    
           WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
           and Trs_Del2.TranOrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
           and Trs_Del2.TranStyleNo=@Style   
           GROUP BY Trs_Del1.Coycode, Trs_Del2.TranOrdID,  
            StockTable.Atype, StockTable.Ades,    
           StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.TranStyleNo,''))    
        UNION ALL    
           (SELECT Trs_Po1.Coycode, Trs_Po5.OrdID, isnull(Trs_Po5.styleno,'')  
            as styleno,    
           Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  
           0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
           0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,  
           0 AS StockQty, 0 as TranOutKgs, 0 as TranInKgs,    
           SUM(Trs_Po5.CancelKgs) as PoCanQty FROM Trs_Po1   
           INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
           and Trs_Po5.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
           and Trs_Po5.styleno=@Style    
           GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID,   
           Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr,    
           Trs_Po5.Siz, isnull(Trs_Po5.styleno,'')))Z   
        INNER JOIN Mas_Acc ON Z.Atype=Mas_Acc.ID   
        INNER JOIN Mas_AccDes ON Z.ADes=Mas_AccDes.ID    
        LEFT OUTER JOIN Mas_Color ON Z.ACol=Mas_Color.ColID   
        LEFT OUTER JOIN Mas_Size ON Z.Asize=Mas_Size.SizeID    
        LEFT OUTER JOIN OrdSizeMas ON Z.Asize=OrdSizeMas.SizeID   
           and Z.OrdId=OrdSizeMas.OrdId    
       group by Z.Coycode,Z.OrdID,Z.styleno,Mas_Acc.Acc_Descr,Z.Atype,Mas_AccDes.AccDescription,  
       Z.ADes,Mas_Color.ColorDesc,Z.ACol,Mas_Size.SizeDesc,Z.Asize,OrdSizeMas.SNo  
       )X group by X.Style,X.Item,X.Descs,X.Color,X.Size Order by style,Item,Descs,X.Color  
   END  
  IF @Type='4'  
   BEGIN  
     SELECT Coycode,  
     Z.OrdID,  
     Z.styleno,  
     (Z.styleno)as Style,  
     SUBSTRING((Mas_Acc.Acc_Descr),1,30)as Item,   
     AType,  
     SUBSTRING((Mas_AccDes.AccDescription),1,20)as Descs,  
     ADes,  
     SUBSTRING((Mas_Color.ColorDesc),1,15)as Color,  
     ACol,  
     (Mas_Size.SizeDesc)as Size,  
     Asize,  
     FLOOR(SUM(ReqQty))as Req_Qty,  
     FLOOR(SUM(ShortQty))as ShortQty,  
     FLOOR(SUM(POQty))as Po_Qty,  
     (0)AS Po_Pen,  
     FLOOR(SUM(RecQty))Grn_Qty,  
     (0) AS Grn_Pen,    
     FLOOR(SUM(DelQty))as Dc_Qty,  
     FLOOR(SUM(Del_Ret))as Dc_Ret,  
     FLOOR(SUM(retqty))as Grn_Ret,  
     FLOOR(SUM(StockQty))as Stock,  
     FLOOR(SUM(TranOutKgs))as Trs_Out,  
     FLOOR(SUM(TranInKgs))as Trs_In,0 AS Trans,  
     FLOOR(SUM(PoCanQty))as Po_Can    
     from(  
      (SELECT OrderMas.ExpID AS Coycode,   
      PRO_AccReq.OrdID,   
      isnull(PRO_AccReq.styleno,'') as styleno,    
      PRO_AccReq.Acc_Type AS AType,   
      PRO_AccReq.Acc_Desc AS ADes,   
      PRO_AccReq.Clr AS ACol,  
      PRO_AccReq.Siz AS ASize,   
      SUM(PRO_AccReq.ReqdQty) AS ReqQty,  
      0 AS ShortQty, 0 AS POQty,   
      0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,   
      0 AS retqty, 0 AS StockQty,    
      0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty   
      FROM PRO_AccReq    
         INNER JOIN OrderMas ON PRO_AccReq.OrdID = OrderMas.OrdId    
           and PRO_AccReq.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
           and PRO_AccReq.StyleNo=@Style   
      GROUP BY OrderMas.ExpID, PRO_AccReq.OrdID, PRO_AccReq.Acc_Type, PRO_AccReq.Acc_Desc,    
         PRO_AccReq.Clr, PRO_AccReq.Siz, isnull(PRO_AccReq.styleno,''))  
  
      UNION ALL    
  
         (SELECT OrderMas.ExpID AS Coycode, Trs_Shortage.OrdID,   
         isnull(Trs_Shortage.styleno,'') as styleno,    
         Trs_Shortage.atype AS AType, Trs_Shortage.ades AS ADes,   
         Trs_Shortage.ColID AS ACol,    
         Trs_Shortage.asiz AS ASize,0 AS ReqQty, SUM(Trs_Shortage.ShortKgs) AS ShortQty,   
         0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Shortage   
         INNER JOIN OrderMas ON Trs_Shortage.OrdID = OrderMas.OrdId    
         and Trs_Shortage.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
         and Trs_Shortage.StyleNo=@Style   
         where Trs_Shortage.Dept=0    
         GROUP BY OrderMas.ExpID, Trs_Shortage.OrdID,   
         Trs_Shortage.atype, Trs_Shortage.ades, Trs_Shortage.ColID,    
         Trs_Shortage.asiz,Trs_Shortage.ColID,   
         Trs_Shortage.asiz, isnull(Trs_Shortage.styleno,''))    
  
      UNION ALL    
         (SELECT Trs_Po1.Coycode,   
         Trs_Po5.OrdID,   
         isnull(Trs_Po5.styleno,'') as styleno,   
         Trs_Po5.AType,    
         Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz, 0 AS ReqQty,0 AS ShortQty,   
         SUM(Trs_Po5.PoQty) AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,  
         0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs,  
         0 as PoCanQty FROM Trs_Po1    
         INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
          and Trs_Po5.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))   
          and Trs_Po5.StyleNo=@Style   
         GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID, Trs_Po5.AType,  
         Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  isnull(Trs_Po5.styleno,''))    
      UNION ALL    
         (SELECT Trs_Grn1.Coycode,   
         Trs_GRN2.ordid, isnull(Trs_GRN2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
         0 AS ReqQty,0 AS ShortQty,    
         0 AS POQty, SUM(Trs_GRN2.RecKgs) AS RecQty, 0 AS DelQty,  
         0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
         INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID    
         INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
         WHERE (StockTable.YF = 'A')    
            and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
            and Trs_GRN2.styleno=@Style   
         GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
         0 AS ReqQty,0 AS ShortQty, 0 AS POQty, 0 AS RecQty, 0 AS delqty,0 AS Del_Ret,   
         SUM(Trs_Del2.Kg) AS retqty, 0 AS StockQty, 0 as TranOutKgs,    
         0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
         INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
         INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
         WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType = 6)    
          and Trs_Del2.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
          and Trs_Del2.styleno=@Style   
         GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
         StockTable.Ades, StockTable.ColID,    
         StockTable.Siz, isnull(Trs_Del2.styleno,''))   
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID, isnull(Trs_Del2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID, StockTable.Siz,   
         0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
         0 AS RecQty, SUM(Trs_Del2.Kg) AS DelQty,0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1    
         INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
         INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
           and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
           and Trs_Del2.styleno=@Style  
         WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType not in (6,8))   
         GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype,   
         StockTable.Ades, StockTable.ColID, StockTable.Siz,    
         isnull(Trs_Del2.styleno,''))    
      UNION ALL    
         (SELECT Trs_Grn1.Coycode, Trs_GRN2.ordid,   
         isnull(Trs_GRN2.styleno,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID,   
         StockTable.Siz, 0 AS ReqQty,0 AS ShortQty,   
         0 AS POQty, 0 AS RecQty, 0 AS DelQty,  
         SUM(Trs_GRN2.RecKgs) AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty FROM Trs_Grn1    
         INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID   
           and Trs_Grn1.GRNType='Acc.Iss.Ret'    
         INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID   
         WHERE (StockTable.YF = 'A')    
         and Trs_GRN2.ordid in (  SELECT ID FROM fnSplitter(@Ordid))   
         and Trs_GRN2.styleno=@Style   
         GROUP BY Trs_Grn1.Coycode, Trs_GRN2.ordid, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_GRN2.styleno,''))    
      UNION ALL    
         (SELECT StockTable.Coycode, StockTable.OrdID,    
         --isnull(Vue_StockAbs.styleno,'') as styleno,
         isnull(CurrentStock.styleno,'') as styleno,
          StockTable.Atype, StockTable.Ades,   
         StockTable.ColID,    
         StockTable.Siz, 0 AS ReqQty, 0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret,  
         0 AS retqty,0 AS ShortQty,   
         SUM(CurrentStock.Kg) AS StockQty, 0 as TranOutKgs, 0 as TranInKgs, 0 as PoCanQty    
         FROM --Vue_StockAbs   
         CurrentStock
         INNER JOIN StockTable ON CurrentStock.StockID = StockTable.StockID    
         WHERE (StockTable.YF = 'A') and StockTable.OrdID   
         in (  SELECT ID FROM fnSplitter(@Ordid))   
           and CurrentStock.styleno=@Style  
         GROUP BY StockTable.Coycode, StockTable.OrdID, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(CurrentStock.styleno,''))   
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.OrdID,   
         isnull(Trs_Del2.styleno,'') as styleno,        
         StockTable.Atype, StockTable.Ades, StockTable.ColID,   
         StockTable.Siz, 0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
         0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,   
         0 AS StockQty, SUM(Trs_Del2.Kg) as TranOutKgs,    
         0 as TranInKgs, 0 as PoCanQty FROM Trs_Del1   
          INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
          INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID    
          AND Trs_Del2.OrdID = StockTable.OrdID   
          WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
          and Trs_Del2.OrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
          and Trs_Del2.styleno=@Style   
         GROUP BY Trs_Del1.Coycode, Trs_Del2.OrdID, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.styleno,''))    
      UNION ALL    
         (SELECT Trs_Del1.Coycode, Trs_Del2.TranOrdID,   
         isnull(Trs_Del2.TranStyleNo,'') as styleno,    
         StockTable.Atype, StockTable.Ades, StockTable.ColID,   
         StockTable.Siz, 0 AS ReqQty,0 AS   
         ShortQty,    
         0 AS POQty, 0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty, 0 AS StockQty,    
         0 as TranOutKgs, SUM(Trs_Del2.Kg) as TranInKgs, 0 as PoCanQty FROM Trs_Del1    
         INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID    
         INNER JOIN StockTable ON Trs_Del2.TranID = StockTable.StockID   
         AND Trs_Del2.TranOrdID = StockTable.OrdID    
         WHERE (StockTable.YF = 'A') AND (Trs_Del1.TrType =8)    
         and Trs_Del2.TranOrdID in ( SELECT ID FROM fnSplitter(@Ordid))  
         and Trs_Del2.TranStyleNo=@Style   
         GROUP BY Trs_Del1.Coycode, Trs_Del2.TranOrdID, StockTable.Atype, StockTable.Ades,    
         StockTable.ColID, StockTable.Siz, isnull(Trs_Del2.TranStyleNo,''))    
      UNION ALL    
         (SELECT Trs_Po1.Coycode, Trs_Po5.OrdID, isnull(Trs_Po5.styleno,'') as styleno,    
         Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr, Trs_Po5.Siz,  
         0 AS ReqQty,0 AS ShortQty, 0 AS POQty,    
         0 AS RecQty, 0 AS DelQty,0 AS Del_Ret, 0 AS retqty,  
         0 AS StockQty, 0 as TranOutKgs, 0 as TranInKgs,    
         SUM(Trs_Po5.CancelKgs) as PoCanQty FROM Trs_Po1   
         INNER JOIN Trs_Po5 ON Trs_Po1.ID = Trs_Po5.ID    
         and Trs_Po5.OrdID in (  SELECT ID FROM fnSplitter(@Ordid) )   
         and Trs_Po5.styleno=@Style    
         GROUP BY Trs_Po1.Coycode, Trs_Po5.OrdID,   
         Trs_Po5.AType, Trs_Po5.Ades, Trs_Po5.Clr,    
         Trs_Po5.Siz, isnull(Trs_Po5.styleno,'')))Z   
      INNER JOIN Mas_Acc ON Z.Atype=Mas_Acc.ID   
      INNER JOIN Mas_AccDes ON Z.ADes=Mas_AccDes.ID    
      LEFT OUTER JOIN Mas_Color ON Z.ACol=Mas_Color.ColID   
      LEFT OUTER JOIN Mas_Size ON Z.Asize=Mas_Size.SizeID    
      LEFT OUTER JOIN OrdSizeMas ON Z.Asize=OrdSizeMas.SizeID   
         and Z.OrdId=OrdSizeMas.OrdId    
     group by Z.Coycode,Z.OrdID,Z.styleno,Mas_Acc.Acc_Descr,Z.Atype,Mas_AccDes.AccDescription,  
     Z.ADes,Mas_Color.ColorDesc,Z.ACol,Mas_Size.SizeDesc,Z.Asize,OrdSizeMas.SNo  
     Order by Z.styleno,Item,Descs,Mas_Color.ColorDesc,OrdSizeMas.SNo   
   END  
 SET NOCOUNT OFF;  
 END  
  
  