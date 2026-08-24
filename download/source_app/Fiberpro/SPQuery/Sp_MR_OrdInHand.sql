/*;=============================================   
; Author           :  Global Software's    
; Create date      :  08/08/2021    
; Create By        :  ASLAM  
; Description      :  Order in Hand for Commando  
; Change Person    :  ASLAM
; Last Change Date :  04/05/2024 11.05 AM 
; =============================================  */  

 CREATE PROCEDURE Sp_MR_OrdInHand (@OrdId Int,@StyleNo Varchar(20),@lotno varchar(15),@StyleQty Numeric(18,3),@CutPlanQty Numeric(18,3),@DespatchPcs int,@NewFlg Char(1),@EntryFlg Char(3)) As 
 
DECLARE @BuyerID int,@SeasonId int,@BuyerDeptID int,@MerchID int,@OrdDt Datetime,@DelDt DateTime,@fcyId int,@salesrate numeric(18,2),

@exrate numeric(18,2),@order_uomid int,@completed int
DECLARE @RATEFOR Char(1),@DespValueINR Numeric(18,2),@DespValue_INFCY NUMERIC(18,2)



SELECT @BuyerID = BuyerId from Ordermas where ORdid = @Ordid 

SELECT @SeasonId = Season from Ordermas where ORdid = @Ordid 

SELECT @BuyerDeptID = BuyerDeptID from Ordermas where ORdid = @Ordid 

SELECT @MerchID = MerchID from Ordermas where ORdid = @Ordid 

SELECT @fcyId = Fcy from Ordermas where ORdid = @Ordid 

SELECT @order_uomid = b.UomID from Ordermas a inner join Mas_Uom b on a.uom = b.Uom where ORdid = @Ordid 

SELECT @OrdDt = BuyordDt from Ordermas where ORdid = @Ordid 

SELECT @exrate = isnull(crate,0) from Ordermas where ORdid = @Ordid 

SELECT @DelDt = delDt from OrderQtyDtl where ORdid = @Ordid  and styleno = @StyleNo and Lotno = @lotno 

IF @lotno=''
	SELECT @salesrate = isnull(avg(salerate),0) from OrderQtyDtl where ORdid = @Ordid  and styleno = @StyleNo 
ELSE
	SELECT @salesrate = isnull(avg(salerate),0) from OrderQtyDtl where ORdid = @Ordid  and styleno = @StyleNo and Lotno = @lotno 

SELECT @completed = Completed from Ordermas where ORdid = @Ordid 



If @NewFlg='Y' 

	Begin Insert Into ST_Ord_inHand (OrdId,buyerid,seasonid,buyerdeptid,merchid,StyleNo,lotno,orddt,deldt,fcyid,salerate,exrate,order_uomid,orderpcs,orderpcs_withExs,completed) Values (@OrdId,@BuyerID,@SeasonId,@BuyerDeptID,@MerchID,@StyleNo,@Lotno,@OrdDt,@DelDt,@fcyid,@salesrate,@exrate,@order_uomid,@StyleQty,@CutPlanQty,@completed) 

	End 

Else 

	If @EntryFlg='OR' 

		Begin 

		Update ST_Ord_inHand Set orderpcs=@StyleQty,orderpcs_withExs=@CutPlanQty,buyerid=@BuyerID,seasonid=@SeasonId,merchid=@MerchID,buyerdeptid=@BuyerDeptID,orddt=@OrdDt,deldt =@DelDt,fcyid=@fcyId,salerate=@salesrate,exrate=@exrate,order_uomid=@order_uomid, completed=@completed Where OrdId=@OrdId And StyleNo=@StyleNo and lotno=@lotno

		End 

		if @EntryFlg='DES'

		begin
			if @LotNo='' 
				Update ST_Ord_inHand Set despatchpcs=@DespatchPcs Where OrdId=@OrdId And StyleNo=@StyleNo 
			Else	
				Update ST_Ord_inHand Set despatchpcs=@DespatchPcs Where OrdId=@OrdId And StyleNo=@StyleNo and lotno=@lotno
		end 

		if @EntryFlg='DEL'
		begin
			if @LotNo='' 
				Update ST_Ord_inHand Set despatchpcs=isnull(despatchpcs,0) - @DespatchPcs Where OrdId=@OrdId And StyleNo=@StyleNo 			
			ELSE
				Update ST_Ord_inHand Set despatchpcs=isnull(despatchpcs,0) - @DespatchPcs Where OrdId=@OrdId And StyleNo=@StyleNo and						lotno=@lotno
		end 

	SELECT @RATEFOR = RATEFOR FROM OrderStyleDtl WHERE ORDID = @OrdId AND StyleNo = @StyleNo

	IF @RATEFOR ='S' 
	BEGIN
			SELECT @DespValueINR = C.SaleRate * B.Pcs * CRate FROM TRS_PCS1 A INNER JOIN (SELECT ID,StyleNo,Sum(Pcs) as Pcs,Avg(Crate) as				CRate FROM TRS_PCS2 GROUP BY				ID,STYLENO) B ON A.ID = B.ID 
			INNER JOIN OrderStyleDtl C ON A.Ordjobno = C.OrdID And B.StyleNo = C.StyleNo 
			WHERE DELTYPE ='Despatch' AND A.OrdjobNo = @OrdId AND B.StyleNo = @StyleNo 

			SELECT @DespValue_INFCY = C.SaleRate * B.Pcs  FROM TRS_PCS1 A INNER JOIN (SELECT ID,StyleNo,Sum(Pcs) as Pcs,Avg(Crate) as					CRate FROM TRS_PCS2 GROUP BY				ID,STYLENO) B ON A.ID = B.ID 
			INNER JOIN OrderStyleDtl C ON A.Ordjobno = C.OrdID And B.StyleNo = C.StyleNo 
			WHERE DELTYPE ='Despatch' AND A.OrdjobNo = @OrdId AND B.StyleNo = @StyleNo 

	END 
	IF @RATEFOR = 'C'
	BEGIN
			SELECT @DespValueINR = C.RATE * B.Pcs * CRate FROM TRS_PCS1 A INNER JOIN (SELECT ID,StyleNo,COLID, Sum(Pcs) as Pcs,Avg(CRate) as			CRate FROM TRS_PCS2 GROUP BY				ID,STYLENO,ColID) B ON A.ID = B.ID 
			INNER JOIN (SELECT ORDID,STYLENO,CMBCLRID,AVG(SaleRate) as RATE FROM  OrderQtyDtl WHERE ORDID = @OrdId And StyleNo = @StyleNo				GROUP BY ORDID,StyleNo,CmbClrID) C ON A.Ordjobno = C.OrdID And B.StyleNo = C.StyleNo 
			WHERE DELTYPE ='Despatch' AND A.OrdjobNo = @OrdId AND B.StyleNo = @StyleNo 

			SELECT @DespValue_INFCY = C.RATE * B.Pcs  FROM TRS_PCS1 A INNER JOIN (SELECT ID,StyleNo,COLID, Sum(Pcs) as Pcs,Avg(CRate) as				CRate FROM TRS_PCS2 GROUP BY				ID,STYLENO,ColID) B ON A.ID = B.ID 
			INNER JOIN (SELECT ORDID,STYLENO,CMBCLRID,AVG(SaleRate) as RATE FROM  OrderQtyDtl WHERE ORDID = @OrdId And StyleNo = @StyleNo				GROUP BY ORDID,StyleNo,CmbClrID) C ON A.Ordjobno = C.OrdID And B.StyleNo = C.StyleNo 
			WHERE DELTYPE ='Despatch' AND A.OrdjobNo = @OrdId AND B.StyleNo = @StyleNo 
	END
	IF @RATEFOR = 'Z'
	BEGIN
			SELECT @DespValueINR = C.RATE * B.Pcs * CRate FROM TRS_PCS1 A INNER JOIN (SELECT ID,StyleNo,COLID, Sum(Pcs) as Pcs,Avg(CRate) as			CRate FROM TRS_PCS2 GROUP BY				ID,STYLENO,COLID) B ON A.ID = B.ID 
			INNER JOIN (SELECT ORDID,STYLENO,CMBCLRID,SIZEID,AVG(SaleRate) as RATE FROM  OrderQtyDtl WHERE ORDID = @OrdId And StyleNo =					@StyleNo GROUP BY ORDID,StyleNo,CmbClrID,SizeId) C ON A.Ordjobno = C.OrdID And B.StyleNo = C.StyleNo 
			WHERE DELTYPE ='Despatch' AND A.OrdjobNo = @OrdId AND B.StyleNo = @StyleNo 

			SELECT @DespValue_INFCY = C.RATE * B.Pcs  FROM TRS_PCS1 A INNER JOIN (SELECT ID,StyleNo,COLID, Sum(Pcs) as Pcs,Avg(CRate) as				CRate FROM TRS_PCS2 GROUP BY ID,STYLENO,COLID) B ON A.ID = B.ID 
			INNER JOIN (SELECT ORDID,STYLENO,CMBCLRID,SIZEID,AVG(SaleRate) as RATE FROM  OrderQtyDtl WHERE ORDID = @OrdId And StyleNo =					@StyleNo GROUP BY ORDID,StyleNo,CmbClrID,SizeId) C ON A.Ordjobno = C.OrdID And B.StyleNo = C.StyleNo 
			WHERE DELTYPE ='Despatch' AND A.OrdjobNo = @OrdId AND B.StyleNo = @StyleNo 

	END
	
	Update ST_Ord_inHand Set DespatchValueINR = @DespValueINR ,salerate= @salesrate Where OrdId=@OrdId And StyleNo=@StyleNo 
	Update ST_Ord_inHand Set DespatchValue_InFCY = @DespValue_INFCY ,salerate= @salesrate Where OrdId=@OrdId And StyleNo=@StyleNo 